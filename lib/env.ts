import type { EVMChain } from "@crossmint/wallets-sdk";

/**
 * NEXT_PUBLIC_* vars must use static `process.env.NEXT_PUBLIC_…` access so
 * Next.js can inline them in the client bundle. Dynamic `process.env[name]`
 * lookups are server-only and cause SSR/client hydration mismatches.
 */
export const env = {
  crossmint: {
    clientApiKey: process.env.NEXT_PUBLIC_CROSSMINT_API_KEY,
    serverApiKey: process.env.CROSSMINT_SERVER_API_KEY,
    chain: (process.env.NEXT_PUBLIC_CROSSMINT_CHAIN ??
      "base-sepolia") as EVMChain,
  },
} as const;

export function requireCrossmintClientApiKey(): string {
  const apiKey = env.crossmint.clientApiKey;
  if (!apiKey) {
    throw new Error(
      "Missing required environment variable: NEXT_PUBLIC_CROSSMINT_API_KEY. See .env.example for setup.",
    );
  }
  return apiKey;
}
