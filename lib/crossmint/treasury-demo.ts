import { createHash, randomBytes } from "node:crypto";

import {
  STAGING_TREASURY_RESERVE_USDXM,
  splitStagingFundAmount,
} from "@/lib/crossmint/payment";
import { treasuryConfig } from "@/lib/crossmint/treasury-config";
import { SHI_VENDOR_TREASURY_ADDRESS } from "@/lib/procurement/lilys-boutique";

/**
 * Demo mode: treasury wallet flows are simulated on-page.
 * Real Crossmint Treasury Wallets (owner: COMPANY) require enterprise enablement.
 */
export const TREASURY_WALLET_DEMO_MODE = true;

export const TREASURY_WALLET_DEMO_DISCLAIMER =
  "Crossmint Treasury Wallets are an enterprise feature. Crossmint must enable Treasury Wallets on your project before live company-treasury funding and server-signed disbursements. This demo simulates Stage 5 payment and treasury balance locally — no on-chain transfer or Crossmint wallets API call is made.";

export const TREASURY_WALLET_DOCS_URL =
  "https://docs.crossmint.com/wallets/guides/treasury-wallets";

const STAGING_FUND_ENDPOINT =
  "POST /api/v1-alpha2/wallets/{address}/balances (token: usdxm) [simulated]";

export function demoTreasuryBalance(): number {
  return STAGING_TREASURY_RESERVE_USDXM;
}

export function demoTransactionHash(seed: string): string {
  const digest = createHash("sha256")
    .update(seed)
    .update(randomBytes(8))
    .digest("hex");
  return `0x${digest}`;
}

export type DemoStagingFundResult = {
  simulated: true;
  funded: boolean;
  fundAmount: number;
  balanceBefore: number;
  balanceAfter: number;
  targetReserve: number;
  calls: Array<{
    callIndex: number;
    amountUsdxm: number;
    endpoint: string;
    crossmintResponse: { simulated: true; note: string };
  }>;
};

export function simulateDemoStagingFund(
  balanceBefore: number = 0,
): DemoStagingFundResult {
  if (balanceBefore >= STAGING_TREASURY_RESERVE_USDXM) {
    return {
      simulated: true,
      funded: false,
      fundAmount: 0,
      balanceBefore,
      balanceAfter: balanceBefore,
      targetReserve: STAGING_TREASURY_RESERVE_USDXM,
      calls: [],
    };
  }

  const fundAmount = STAGING_TREASURY_RESERVE_USDXM - balanceBefore;
  const chunks = splitStagingFundAmount(fundAmount);

  return {
    simulated: true,
    funded: true,
    fundAmount,
    balanceBefore,
    balanceAfter: STAGING_TREASURY_RESERVE_USDXM,
    targetReserve: STAGING_TREASURY_RESERVE_USDXM,
    calls: chunks.map((amountUsdxm, index) => ({
      callIndex: index + 1,
      amountUsdxm,
      endpoint: STAGING_FUND_ENDPOINT,
      crossmintResponse: {
        simulated: true,
        note: "Demo mode — stagingFund not invoked.",
      },
    })),
  };
}

export type DemoTreasuryPaymentResult = {
  simulated: true;
  hash: string;
  explorerLink?: undefined;
  amount: string;
  token: string;
  recipient: string;
  treasuryAddress: string;
  fundedAmount: number;
  balanceBefore: number;
  balanceAfter: number;
  signerType: "demo";
  disclaimer: string;
};

export function simulateDemoTreasuryPayment(
  amountUsd: number,
  recipient: string = SHI_VENDOR_TREASURY_ADDRESS,
  token: string = "usdxm",
  balanceBefore: number = demoTreasuryBalance(),
): DemoTreasuryPaymentResult {
  const amount = amountUsd.toFixed(2);
  const balanceAfter = Math.max(0, balanceBefore - amountUsd);

  return {
    simulated: true,
    hash: demoTransactionHash(
      `demo-payment:${treasuryConfig.address}:${recipient}:${amount}:${Date.now()}`,
    ),
    amount,
    token,
    recipient,
    treasuryAddress: treasuryConfig.address,
    fundedAmount: 0,
    balanceBefore,
    balanceAfter,
    signerType: "demo",
    disclaimer: TREASURY_WALLET_DEMO_DISCLAIMER,
  };
}

export async function demoTreasuryDelay(ms = 1200): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}
