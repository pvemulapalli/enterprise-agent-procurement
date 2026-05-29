import type { Balances, Chain } from "@crossmint/wallets-sdk";

import { STABLECOIN_SYMBOLS, type StablecoinSymbol } from "./config";

export type StablecoinBalance = {
  symbol: StablecoinSymbol;
  name: string;
  amount: string;
  decimals?: number;
};

export function extractStablecoinBalances<C extends Chain>(
  balances: Balances<C>,
): StablecoinBalance[] {
  const results: StablecoinBalance[] = [];

  for (const symbol of STABLECOIN_SYMBOLS) {
    if (symbol === "usdc") {
      const usdc = balances.usdc;
      if (usdc && "amount" in usdc) {
        results.push({
          symbol: symbol as StablecoinSymbol,
          name: usdc.name,
          amount: usdc.amount,
          decimals: usdc.decimals,
        });
        continue;
      }
    }

    const fromTokens = balances.tokens?.find(
      (token) => token.symbol?.toLowerCase() === symbol.toLowerCase(),
    );
    if (fromTokens && "amount" in fromTokens) {
      results.push({
        symbol: symbol as StablecoinSymbol,
        name: fromTokens.name,
        amount: fromTokens.amount,
        decimals: fromTokens.decimals,
      });
      continue;
    }

    const token = balances[symbol as keyof Balances<C>];
    if (!token || !("amount" in token)) continue;
    results.push({
      symbol: symbol as StablecoinSymbol,
      name: token.name,
      amount: token.amount,
      decimals: token.decimals,
    });
  }

  return results;
}

export function formatTokenAmount(amount: string, decimals = 2): string {
  const parsed = Number.parseFloat(amount);
  if (Number.isNaN(parsed)) return amount;
  return parsed.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
}
