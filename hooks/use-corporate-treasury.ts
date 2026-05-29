"use client";

import { useCallback, useEffect, useState } from "react";

import { crossmintApiEndpoints } from "@/lib/crossmint/endpoints";
import {
  formatStablecoinBalanceLabel,
  getPaymentToken,
  isStagingChain,
  STAGING_TREASURY_RESERVE_USDXM,
} from "@/lib/crossmint/payment";
import { treasuryConfig } from "@/lib/crossmint/treasury-config";
import { TREASURY_WALLET_DEMO_MODE } from "@/lib/crossmint/treasury-demo";

export type CorporateTreasuryStatus = "loading" | "ready" | "error";

export type TreasuryPaymentOptions = {
  onBatchFunded?: (info: {
    batch: number;
    batches: number;
    increment: number;
    totalFundAmount: number;
  }) => void;
};

type TreasuryBalanceResponse = {
  balance?: number;
  error?: string;
};

type TreasuryFundResponse = {
  funded?: boolean;
  fundAmount?: number;
  simulated?: boolean;
  calls?: Array<{
    callIndex: number;
    amountUsdxm: number;
    endpoint: string;
    crossmintResponse: unknown;
  }>;
  balanceBefore?: number;
  balanceAfter?: number;
  targetReserve?: number;
  error?: string;
};

type TreasuryPaymentResponse = {
  hash?: string;
  simulated?: boolean;
  error?: string;
  balanceAfter?: number;
  explorerLink?: string;
};

/**
 * Company treasury — demo mode simulates balance, funding, and payment locally.
 * @see https://docs.crossmint.com/wallets/guides/treasury-wallets
 */
export function useCorporateTreasury(refreshKey = 0) {
  const [balance, setBalance] = useState<number | null>(null);
  const [status, setStatus] = useState<CorporateTreasuryStatus>("loading");
  const [error, setError] = useState<string | null>(null);
  const [isFunding, setIsFunding] = useState(false);

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setStatus("loading");
      setError(null);
    }

    try {
      const response = await fetch(crossmintApiEndpoints.treasuryBalance.path, {
        cache: "no-store",
      });
      const data = (await response.json()) as TreasuryBalanceResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to read treasury balance.");
      }
      setBalance((prev) => {
        const next = typeof data.balance === "number" ? data.balance : 0;
        if (
          TREASURY_WALLET_DEMO_MODE &&
          prev !== null &&
          prev < STAGING_TREASURY_RESERVE_USDXM
        ) {
          return prev;
        }
        return next;
      });
      setStatus("ready");
      setError(null);
    } catch (err) {
      if (!options?.silent) {
        setBalance(null);
        setStatus("error");
      }
      setError(
        err instanceof Error ? err.message : "Unable to load treasury wallet.",
      );
    }
  }, []);

  useEffect(() => {
    void refresh(refreshKey > 0 ? { silent: true } : undefined);
  }, [refresh, refreshKey]);

  const fundStagingIfNeeded = useCallback(async (): Promise<TreasuryFundResponse> => {
    if (!isStagingChain(treasuryConfig.chain)) {
      return { funded: false, fundAmount: 0 };
    }
    if (balance !== null && balance >= STAGING_TREASURY_RESERVE_USDXM) {
      return { funded: false, fundAmount: 0, balanceAfter: balance };
    }

    setIsFunding(true);
    try {
      const response = await fetch(crossmintApiEndpoints.treasuryFundStaging.path, {
        method: "POST",
        cache: "no-store",
      });
      const data = (await response.json()) as TreasuryFundResponse;
      if (!response.ok) {
        throw new Error(data.error ?? "Unable to fund treasury.");
      }

      if (typeof data.balanceAfter === "number") {
        setBalance(data.balanceAfter);
        setStatus("ready");
      } else {
        await refresh({ silent: true });
      }

      return data;
    } finally {
      setIsFunding(false);
    }
  }, [balance, refresh]);

  const executePayment = useCallback(
    async (amountUsd: number, _options: TreasuryPaymentOptions = {}) => {
      const response = await fetch(crossmintApiEndpoints.treasuryExecutePayment.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountUsd,
          balanceBefore: balance ?? undefined,
        }),
        cache: "no-store",
      });

      const result = (await response.json()) as TreasuryPaymentResponse;
      if (!response.ok) {
        throw new Error(result.error ?? "Treasury payment failed.");
      }

      if (typeof result.balanceAfter === "number") {
        setBalance(result.balanceAfter);
      }

      if (!result.hash) {
        throw new Error("Payment did not return a transaction reference.");
      }

      return {
        hash: result.hash,
        explorerLink: result.explorerLink,
        simulated: result.simulated ?? false,
      };
    },
    [balance],
  );

  const token = getPaymentToken(treasuryConfig.chain);

  return {
    address: treasuryConfig.address,
    alias: treasuryConfig.alias,
    displayName: treasuryConfig.displayName,
    chain: treasuryConfig.chain,
    token,
    balance,
    formattedBalance:
      balance !== null
        ? formatStablecoinBalanceLabel(balance, treasuryConfig.chain)
        : null,
    status,
    error,
    isFunding,
    refresh,
    fundStagingIfNeeded,
    executePayment,
  };
}
