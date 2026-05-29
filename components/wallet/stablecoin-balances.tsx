"use client";

import { useEffect, useState } from "react";
import { useWallet } from "@crossmint/client-sdk-react-ui";
import type { Balances, Chain } from "@crossmint/wallets-sdk";

import {
  extractStablecoinBalances,
  formatTokenAmount,
  type StablecoinBalance,
} from "@/lib/crossmint/stablecoin";
import { STABLECOIN_SYMBOLS } from "@/lib/crossmint/config";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";

export function StablecoinBalances() {
  const { wallet, status } = useWallet();
  const [balances, setBalances] = useState<StablecoinBalance[]>([]);
  const [nativeBalance, setNativeBalance] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "loaded" || !wallet) return;

    let cancelled = false;

    async function fetchBalances() {
      setIsLoading(true);
      setError(null);

      try {
        const result: Balances<Chain> = await wallet!.balances([
          ...STABLECOIN_SYMBOLS,
        ]);
        if (cancelled) return;

        setNativeBalance(result.nativeToken.amount);
        setBalances(extractStablecoinBalances(result));
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load treasury balances.",
        );
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void fetchBalances();

    return () => {
      cancelled = true;
    };
  }, [wallet, status]);

  if (status !== "loaded" || !wallet) return null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
            Settlement Rail
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-50">
            Treasury Liquidity
          </h2>
        </div>
        <Badge variant="muted">USDC</Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Spinner label="Retrieving treasury balances…" size="sm" />
          </div>
        ) : null}

        {error ? <Alert variant="error">{error}</Alert> : null}

        {!isLoading && !error ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {nativeBalance !== null ? (
              <BalanceTile
                label="Network operations reserve"
                symbol="ETH"
                amount={formatTokenAmount(nativeBalance, 6)}
              />
            ) : null}

            {balances.map((token) => (
              <BalanceTile
                key={token.symbol}
                label={token.name}
                symbol={token.symbol.toUpperCase()}
                amount={formatTokenAmount(token.amount, token.decimals ?? 2)}
              />
            ))}

            {balances.length === 0 && nativeBalance === null ? (
              <Alert variant="info">
                No settled balances on record. Fund the corporate treasury
                account to enable stablecoin disbursements.
              </Alert>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function BalanceTile({
  label,
  symbol,
  amount,
}: {
  label: string;
  symbol: string;
  amount: string;
}) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-950/50 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-50">
        {amount}
      </p>
      <p className="mt-1 text-xs font-medium text-emerald-400">{symbol}</p>
    </div>
  );
}
