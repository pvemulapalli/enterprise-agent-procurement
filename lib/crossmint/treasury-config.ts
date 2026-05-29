import type { EVMChain } from "@crossmint/wallets-sdk";

import { env } from "@/lib/env";

/**
 * Lily's Boutique company treasury (owner: COMPANY).
 * Create once via npm run create-treasury — not a user embedded wallet.
 * @see https://docs.crossmint.com/wallets/guides/treasury-wallets
 */
export const treasuryConfig = {
  address:
    process.env.NEXT_PUBLIC_CROSSMINT_TREASURY_WALLET_ADDRESS ??
    "0xDFF19F2dA41fCD1446cb26FBcB1c2360cB56a7F6",
  alias:
    process.env.NEXT_PUBLIC_CROSSMINT_TREASURY_WALLET_ALIAS ??
    "lilys-boutique-treasury",
  /** Display label only — company treasuries are not keyed by userId. */
  displayName:
    process.env.NEXT_PUBLIC_CROSSMINT_TREASURY_DISPLAY_NAME ??
    "Lily's Boutique Treasury",
  chain: env.crossmint.chain satisfies EVMChain,
} as const;
