import { createCrossmint, CrossmintWallets } from "@crossmint/wallets-sdk";
import type { Chain, Wallet } from "@crossmint/wallets-sdk";

import {
  computeStagingReserveTopUp,
  ensureStagingTreasuryFunds,
  getPaymentToken,
  getTransactionExplorerLink,
  isStagingChain,
  readWalletStablecoinBalance,
  splitStagingFundAmount,
  STAGING_TREASURY_RESERVE_USDXM,
} from "@/lib/crossmint/payment";
import { treasuryConfig } from "@/lib/crossmint/treasury-config";
import { serverEnv, requireCrossmintServerApiKey } from "@/lib/env.server";
import { SHI_VENDOR_TREASURY_ADDRESS } from "@/lib/procurement/lilys-boutique";

export type TreasurySignerStatus = {
  treasuryAddress: string;
  recoveryType: string;
  recoveryEmail?: string;
  serverSignerRegistered: boolean;
  serverSignerApproved: boolean;
  serverSignerLocator?: string;
  serverSignerStatus?: string;
  /** Crossmint signature id for pending signer registration (EVM). */
  pendingSignatureId?: string;
  pendingApprovalEndpoint?: string;
  canServerSign: boolean;
  approvalHint?: string;
};

async function readPendingSignerApproval(
  wallet: Wallet<Chain>,
  signerLocator: string,
): Promise<{ signatureId?: string; endpoint?: string }> {
  try {
    const detail = await wallet.apiClient.getSigner(
      treasuryConfig.address,
      signerLocator,
    );
    if (!detail || typeof detail !== "object" || "error" in detail) {
      return {};
    }
    if (!("chains" in detail) || !detail.chains) {
      return {};
    }
    const chainEntry = detail.chains[treasuryConfig.chain];
    if (
      !chainEntry ||
      chainEntry.status !== "awaiting-approval" ||
      !chainEntry.id
    ) {
      return {};
    }
    return {
      signatureId: chainEntry.id,
      endpoint: `POST /2025-06-09/wallets/${treasuryConfig.address}/signatures/${chainEntry.id}/approvals`,
    };
  } catch {
    return {};
  }
}

export async function getTreasurySignerStatus(): Promise<TreasurySignerStatus> {
  const wallet = await getCorporateTreasuryWallet();
  const recovery = wallet.recovery;
  const signers = await wallet.signers();
  const serverSigner = signers.find((signer) => signer.type === "server");
  const locator = serverSigner?.locator;
  const approved =
    locator !== undefined
      ? await wallet.isSignerApproved(locator)
      : false;

  const recoveryEmail =
    recovery.type === "email" && "email" in recovery
      ? recovery.email
      : undefined;

  const pendingApproval =
    locator && !approved
      ? await readPendingSignerApproval(wallet, locator)
      : {};

  let approvalHint: string | undefined;
  if (serverSigner && !approved) {
    approvalHint =
      recovery.type === "email" && recoveryEmail
        ? pendingApproval.signatureId
          ? `Server signer registration is pending. Use "Approve treasury signer" below — Crossmint will email a one-time OTP to ${recoveryEmail} to authorize the delegated signer via the signatures API.`
          : `The server signer needs approval from the wallet recovery email (${recoveryEmail}). Re-register or contact Crossmint support if approval cannot be completed.`
        : "The server signer is pending approval. Complete signer approval in the app, or create a COMPANY treasury wallet (npm run create-treasury).";
  }

  return {
    treasuryAddress: treasuryConfig.address,
    recoveryType: recovery.type,
    recoveryEmail,
    serverSignerRegistered: Boolean(serverSigner),
    serverSignerApproved: approved,
    serverSignerLocator: serverSigner?.locator,
    serverSignerStatus:
      serverSigner && "status" in serverSigner
        ? String(serverSigner.status)
        : undefined,
    pendingSignatureId: pendingApproval.signatureId,
    pendingApprovalEndpoint: pendingApproval.endpoint,
    canServerSign: approved,
    approvalHint,
  };
}

/** Company treasury (owner: COMPANY) via server API key — not a user embedded wallet. */
async function getCorporateTreasuryWallet(): Promise<Wallet<Chain>> {
  const crossmint = createCrossmint({
    apiKey: requireCrossmintServerApiKey(),
  });
  const wallets = CrossmintWallets.from(crossmint);

  try {
    return await wallets.getWallet(treasuryConfig.address, {
      chain: treasuryConfig.chain,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "lookup failed";
    throw new Error(
      `Unable to load company treasury at ${treasuryConfig.address}. ` +
        "Create a COMPANY treasury wallet (npm run create-treasury) and set " +
        "NEXT_PUBLIC_CROSSMINT_TREASURY_WALLET_ADDRESS. " +
        `(${detail})`,
    );
  }
}

/**
 * Ensures a server signer is registered and active.
 * If CROSSMINT_SIGNER_SECRET is set but not yet on the wallet, calls addSigner()
 * (recovery signer approves automatically for company/server-recovery wallets).
 * @see https://docs.crossmint.com/wallets/guides/signers/add-signers
 */
export async function ensureTreasuryServerSigner(
  wallet: Wallet<Chain>,
): Promise<"server" | "api-key"> {
  const secret = serverEnv.crossmint.signerSecret;
  const signers = await wallet.signers();
  const pendingServer = signers.find(
    (signer) =>
      signer.type === "server" &&
      "status" in signer &&
      signer.status === "awaiting-approval",
  );

  if (pendingServer) {
    const status = await getTreasurySignerStatus();
    throw new Error(
      status.approvalHint ??
        "Treasury server signer is awaiting approval before it can sign payments.",
    );
  }

  if (secret) {
    const serverSigner = signers.find((signer) => signer.type === "server");
    if (serverSigner?.locator) {
      const approved = await wallet.isSignerApproved(serverSigner.locator);
      if (approved) {
        await wallet.useSigner({ type: "server", secret });
        return "server";
      }
    }

    try {
      await wallet.useSigner({ type: "server", secret });
      const approvedAfterUse = serverSigner?.locator
        ? await wallet.isSignerApproved(serverSigner.locator)
        : true;
      if (approvedAfterUse) return "server";
    } catch {
      // Fall through to registration attempt.
    }

    if (!serverSigner) {
      try {
        await wallet.addSigner({ type: "server", secret });
        await wallet.useSigner({ type: "server", secret });
        return "server";
      } catch (registerError) {
        const detail =
          registerError instanceof Error
            ? registerError.message
            : "registration failed";
        if (detail.includes("window is not defined")) {
          const status = await getTreasurySignerStatus();
          throw new Error(
            status.approvalHint ??
              "Server signer registration requires email OTP approval in the browser. " +
                "Approve the pending signer in Crossmint Console, or create a COMPANY treasury wallet.",
          );
        }
        throw new Error(
          "Could not activate server signer on company treasury. " +
            "Ensure the wallet was created with owner: COMPANY (npm run create-treasury), " +
            "CROSSMINT_SIGNER_SECRET matches the recovery/operational secret from creation, " +
            "and the server API key includes wallets:signatures.create and wallets:transactions.create. " +
            `(${detail})`,
        );
      }
    }

    const status = await getTreasurySignerStatus();
    throw new Error(
      status.approvalHint ??
        "Treasury server signer is not approved for signing on this chain.",
    );
  }

  try {
    await wallet.useSigner({ type: "api-key" });
    return "api-key";
  } catch (apiKeyError) {
    const detail =
      apiKeyError instanceof Error ? apiKeyError.message : "activation failed";
    throw new Error(
      "Set CROSSMINT_SIGNER_SECRET in .env.local (generate: " +
        'CROSSMINT_SIGNER_SECRET="xmsk1_$(openssl rand -hex 32)"). ' +
        "User embedded wallets cannot sign via server API key — create a COMPANY treasury " +
        "with npm run create-treasury. " +
        `(${detail})`,
    );
  }
}

export async function readCorporateTreasuryBalance(): Promise<number> {
  const wallet = await getCorporateTreasuryWallet();
  return readWalletStablecoinBalance(wallet, treasuryConfig.chain);
}

export type StagingFundCallRecord = {
  callIndex: number;
  amountUsdxm: number;
  endpoint: string;
  crossmintResponse: unknown;
};

export type StagingFundResult = {
  funded: boolean;
  fundAmount: number;
  balanceBefore: number;
  balanceAfter: number;
  targetReserve: number;
  /** One entry per Crossmint stagingFund HTTP request (max 100 USDXM each). */
  calls: StagingFundCallRecord[];
};

const STAGING_FUND_ENDPOINT =
  "POST /api/v1-alpha2/wallets/{address}/balances (token: usdxm)";

/**
 * Fund treasury up to $200 USDXM reserve on staging.
 * Crossmint allows at most 100 USDXM per stagingFund request — multiple calls as needed.
 */
export async function fundCorporateTreasuryStagingReserve(): Promise<StagingFundResult> {
  const wallet = await getCorporateTreasuryWallet();
  const balanceBefore = await readWalletStablecoinBalance(
    wallet,
    treasuryConfig.chain,
  );

  if (!isStagingChain(treasuryConfig.chain)) {
    return {
      funded: false,
      fundAmount: 0,
      balanceBefore,
      balanceAfter: balanceBefore,
      targetReserve: STAGING_TREASURY_RESERVE_USDXM,
      calls: [],
    };
  }

  const { fundAmount } = computeStagingReserveTopUp(balanceBefore);
  if (fundAmount === 0) {
    return {
      funded: false,
      fundAmount: 0,
      balanceBefore,
      balanceAfter: balanceBefore,
      targetReserve: STAGING_TREASURY_RESERVE_USDXM,
      calls: [],
    };
  }

  const chunks = splitStagingFundAmount(fundAmount);
  const calls: StagingFundCallRecord[] = [];

  for (let index = 0; index < chunks.length; index += 1) {
    const amount = chunks[index]!;
    const crossmintResponse = await wallet.stagingFund(
      amount,
      treasuryConfig.chain as Chain,
    );
    calls.push({
      callIndex: index + 1,
      amountUsdxm: amount,
      endpoint: STAGING_FUND_ENDPOINT,
      crossmintResponse,
    });
  }

  let balanceAfter = await readWalletStablecoinBalance(
    wallet,
    treasuryConfig.chain,
  );

  if (balanceAfter === 0 && balanceBefore + fundAmount > 0) {
    balanceAfter = balanceBefore + fundAmount;
  }

  return {
    funded: true,
    fundAmount,
    balanceBefore,
    balanceAfter,
    targetReserve: STAGING_TREASURY_RESERVE_USDXM,
    calls,
  };
}

export type CorporateTreasuryPaymentResult = {
  hash: string;
  explorerLink?: string;
  amount: string;
  token: string;
  recipient: string;
  treasuryAddress: string;
  fundedAmount: number;
  balanceBefore: number;
  balanceAfter: number;
  signerType: "server" | "api-key";
};

export async function executeCorporateTreasuryPayment(
  amountUsd: number,
  recipient: string = SHI_VENDOR_TREASURY_ADDRESS,
): Promise<CorporateTreasuryPaymentResult> {
  const wallet = await getCorporateTreasuryWallet();
  const signerType = await ensureTreasuryServerSigner(wallet);

  const paymentToken = getPaymentToken(treasuryConfig.chain);
  const amount = amountUsd.toFixed(2);

  const balanceBefore = await readWalletStablecoinBalance(
    wallet,
    treasuryConfig.chain,
  );

  let fundedAmount = 0;
  if (balanceBefore < amountUsd && isStagingChain(treasuryConfig.chain)) {
    const funding = await ensureStagingTreasuryFunds(
      wallet,
      amountUsd,
      () => {},
      treasuryConfig.chain,
    );
    fundedAmount = funding.totalFundAmount;
  }

  const balanceAfter = await readWalletStablecoinBalance(
    wallet,
    treasuryConfig.chain,
  );

  if (balanceAfter < amountUsd) {
    throw new Error(
      `Insufficient treasury balance (${balanceAfter.toFixed(2)} ${paymentToken.toUpperCase()}). Need ${amount}. ` +
        `Treasury should be pre-funded to $${STAGING_TREASURY_RESERVE_USDXM} USDXM after login.`,
    );
  }

  const result = await wallet.send(recipient, paymentToken, amount);
  if (!result.hash) {
    throw new Error("Crossmint did not return a transaction hash.");
  }

  return {
    hash: result.hash,
    explorerLink: getTransactionExplorerLink(treasuryConfig.chain, result.hash),
    amount,
    token: paymentToken,
    recipient,
    treasuryAddress: treasuryConfig.address,
    fundedAmount,
    balanceBefore,
    balanceAfter,
    signerType,
  };
}
