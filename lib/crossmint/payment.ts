import type { Balances, Chain, Wallet } from "@crossmint/wallets-sdk";

import { env } from "@/lib/env";

const defaultChain = env.crossmint.chain ?? "base-sepolia";

/** USDXM top-up size on staging (see Crossmint staging tokens guide). */
export const STAGING_FUND_INCREMENT_USDXM = 100;

/** Target staging treasury reserve funded after login / Stage 1 ($200). */
export const STAGING_TREASURY_RESERVE_USDXM = 200;

/** Minimum number of 100 USDXM batches when auto-funding (~$200 for sub-$200 orders). */
export const STAGING_FUND_MIN_BATCHES = 2;

export function isStagingChain(chain: string = defaultChain): boolean {
  return (
    chain.includes("sepolia") ||
    chain.includes("amoy") ||
    chain.includes("testnet") ||
    chain.includes("devnet")
  );
}

/** Staging testnets use USDXM; production uses USDC. */
export function getPaymentToken(chain: string = defaultChain): "usdxm" | "usdc" {
  return isStagingChain(chain) ? "usdxm" : "usdc";
}

export function getBalanceQueryTokens(chain: string = defaultChain): string[] {
  const paymentToken = getPaymentToken(chain);
  return paymentToken === "usdxm" ? ["usdxm", "usdc"] : ["usdc"];
}

function tokenBalanceAmount(
  entry:
    | { amount?: string; rawAmount?: string; decimals?: number }
    | undefined,
): number | null {
  if (!entry) return null;

  if (
    entry.rawAmount &&
    typeof entry.rawAmount === "string" &&
    typeof entry.decimals === "number"
  ) {
    const raw = BigInt(entry.rawAmount);
    const divisor = BigInt(10) ** BigInt(entry.decimals);
    const whole = raw / divisor;
    const fraction = raw % divisor;
    return Number(whole) + Number(fraction) / Number(divisor);
  }

  if ("amount" in entry && typeof entry.amount === "string") {
    const parsed = Number.parseFloat(entry.amount);
    return Number.isNaN(parsed) ? null : parsed;
  }

  return null;
}

export function readStablecoinBalance(
  balances: Balances<Chain>,
  chain: string = defaultChain,
): number {
  const paymentToken = getPaymentToken(chain);
  const candidates = paymentToken === "usdxm" ? ["usdxm", "usdc"] : ["usdc"];

  for (const symbol of candidates) {
    if (symbol === "usdc") {
      const fromUsdc = tokenBalanceAmount(balances.usdc);
      if (fromUsdc !== null && fromUsdc > 0) return fromUsdc;
    }

    const fromTokens = balances.tokens?.find(
      (token) => token.symbol?.toLowerCase() === symbol.toLowerCase(),
    );
    const fromTokensAmount = tokenBalanceAmount(fromTokens);
    if (fromTokensAmount !== null) return fromTokensAmount;

    const legacyEntry = balances[symbol as keyof Balances<Chain>];
    if (legacyEntry && typeof legacyEntry === "object" && "amount" in legacyEntry) {
      const fromLegacy = tokenBalanceAmount(
        legacyEntry as { amount?: string },
      );
      if (fromLegacy !== null) return fromLegacy;
    }
  }

  return 0;
}

export async function readWalletStablecoinBalance(
  wallet: Wallet<Chain>,
  chain: string = defaultChain,
): Promise<number> {
  const balances = await wallet.balances(getBalanceQueryTokens(chain));
  return readStablecoinBalance(balances, chain);
}

export function computeStagingFundPlan(
  currentBalance: number,
  requiredAmount: number,
): { batches: number; totalFundAmount: number } {
  if (currentBalance >= requiredAmount) {
    return { batches: 0, totalFundAmount: 0 };
  }

  const minimumReserve =
    STAGING_FUND_INCREMENT_USDXM * STAGING_FUND_MIN_BATCHES;
  const targetBalance = Math.max(requiredAmount, minimumReserve);
  const deficit = targetBalance - currentBalance;
  const batches = Math.max(
    STAGING_FUND_MIN_BATCHES,
    Math.ceil(deficit / STAGING_FUND_INCREMENT_USDXM),
  );

  return {
    batches,
    totalFundAmount: batches * STAGING_FUND_INCREMENT_USDXM,
  };
}

export async function ensureStagingTreasuryFunds(
  wallet: Wallet<Chain>,
  requiredAmount: number,
  onBatchFunded: (info: {
    batch: number;
    batches: number;
    increment: number;
    totalFundAmount: number;
  }) => void,
  chain: string = defaultChain,
): Promise<{ funded: boolean; totalFundAmount: number; finalBalance: number }> {
  let balance = await readWalletStablecoinBalance(wallet, chain);
  const plan = computeStagingFundPlan(balance, requiredAmount);

  if (plan.batches === 0) {
    return { funded: false, totalFundAmount: 0, finalBalance: balance };
  }

  for (let batch = 1; batch <= plan.batches; batch += 1) {
    onBatchFunded({
      batch,
      batches: plan.batches,
      increment: STAGING_FUND_INCREMENT_USDXM,
      totalFundAmount: plan.totalFundAmount,
    });
    await wallet.stagingFund(STAGING_FUND_INCREMENT_USDXM, chain as Chain);
  }

  balance = await readWalletStablecoinBalance(wallet, chain);
  return {
    funded: true,
    totalFundAmount: plan.totalFundAmount,
    finalBalance: balance,
  };
}

const EXPLORER_TX_URL: Partial<Record<string, string>> = {
  "base-sepolia": "https://sepolia.basescan.org/tx/",
  base: "https://basescan.org/tx/",
  "ethereum-sepolia": "https://sepolia.etherscan.io/tx/",
  ethereum: "https://etherscan.io/tx/",
  "polygon-amoy": "https://amoy.polygonscan.com/tx/",
  polygon: "https://polygonscan.com/tx/",
};

export function getTransactionExplorerLink(
  chain: string,
  hash: string,
): string | undefined {
  const base = EXPLORER_TX_URL[chain];
  return base ? `${base}${hash}` : undefined;
}

/** User-facing stablecoin symbol for the active chain. */
export function getStablecoinSymbol(chain: string = defaultChain): string {
  return getPaymentToken(chain).toUpperCase();
}

/** Plain-language note for operators about staging vs production stablecoins. */
export function getStablecoinEnvironmentNote(chain: string = defaultChain): string {
  if (isStagingChain(chain)) {
    return "USDXM is Crossmint’s sandbox stablecoin — each token represents $1, equivalent to USDC in production.";
  }
  return "USDC is the production stablecoin — each token represents $1 USD.";
}

/** Formatted balance with symbol and staging/production context. */
export function formatStablecoinBalanceLabel(
  amount: number,
  chain: string = defaultChain,
): string {
  const symbol = getStablecoinSymbol(chain);
  const formatted = amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (isStagingChain(chain)) {
    return `${formatted} ${symbol} (sandbox · 1:1 with USDC)`;
  }
  return `${formatted} ${symbol}`;
}

export function computeStagingReserveTopUp(currentBalance: number): {
  fundAmount: number;
} {
  if (currentBalance >= STAGING_TREASURY_RESERVE_USDXM) {
    return { fundAmount: 0 };
  }

  return {
    fundAmount: STAGING_TREASURY_RESERVE_USDXM - currentBalance,
  };
}

/** Split a staging fund total into API calls (Crossmint max 100 USDXM per request). */
export function splitStagingFundAmount(totalAmount: number): number[] {
  if (totalAmount <= 0) return [];

  const chunks: number[] = [];
  let remaining = totalAmount;

  while (remaining > 0) {
    const chunk = Math.min(remaining, STAGING_FUND_INCREMENT_USDXM);
    chunks.push(chunk);
    remaining -= chunk;
  }

  return chunks;
}
