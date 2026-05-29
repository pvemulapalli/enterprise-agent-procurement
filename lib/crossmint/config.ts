import type { EVMChain } from "@crossmint/wallets-sdk";

import { env } from "@/lib/env";

function stablecoinSymbolsForChain(chain: string): readonly string[] {
  if (
    chain.includes("sepolia") ||
    chain.includes("amoy") ||
    chain.includes("testnet")
  ) {
    return ["usdxm", "usdc"];
  }
  return ["usdc"];
}

/** Balance query symbols — includes USDXM on staging testnets. */
export const STABLECOIN_SYMBOLS = stablecoinSymbolsForChain(
  env.crossmint.chain ?? "base-sepolia",
);
export type StablecoinSymbol = (typeof STABLECOIN_SYMBOLS)[number];

/** Must match Crossmint Console → Settings → Branding → Display name (OTP emails). */
export const crossmintAppDisplayName = "Lily's Boutique";

export const crossmintConfig = {
  apiKey: env.crossmint.clientApiKey,
  chain: env.crossmint.chain satisfies EVMChain,
  auth: {
    loginMethods: ["email"] as const,
    authModalTitle: `Sign in to ${crossmintAppDisplayName}`,
  },
} as const;
