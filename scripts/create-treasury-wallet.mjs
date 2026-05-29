/**
 * One-time setup: create Lily's Boutique company treasury wallet (owner: COMPANY).
 *
 * @see https://docs.crossmint.com/wallets/guides/treasury-wallets
 *
 * Usage:
 *   npm run create-treasury
 *
 * Requires in .env.local:
 *   CROSSMINT_SERVER_API_KEY  (scopes: wallets.create, wallets.read, wallets:transactions.create,
 *                              wallets:transactions.sign, wallets:balance.read, wallets.fund,
 *                              wallets:signatures.create)
 *   CROSSMINT_SIGNER_SECRET   (generate: CROSSMINT_SIGNER_SECRET="xmsk1_$(openssl rand -hex 32)")
 *
 * Optional:
 *   NEXT_PUBLIC_CROSSMINT_CHAIN          (default: base-sepolia)
 *   NEXT_PUBLIC_CROSSMINT_TREASURY_WALLET_ALIAS (default: lilys-boutique-treasury)
 */
import { createCrossmint, CrossmintWallets } from "@crossmint/wallets-sdk";

const chain = process.env.NEXT_PUBLIC_CROSSMINT_CHAIN ?? "base-sepolia";
const alias =
  process.env.NEXT_PUBLIC_CROSSMINT_TREASURY_WALLET_ALIAS ??
  "lilys-boutique-treasury";
const apiKey = process.env.CROSSMINT_SERVER_API_KEY;
const signerSecret = process.env.CROSSMINT_SIGNER_SECRET;

function requireEnv(name, value) {
  if (!value?.trim()) {
    console.error(`Missing ${name} in .env.local`);
    process.exit(1);
  }
  return value.trim();
}

async function main() {
  requireEnv("CROSSMINT_SERVER_API_KEY", apiKey);
  requireEnv("CROSSMINT_SIGNER_SECRET", signerSecret);

  const crossmint = createCrossmint({ apiKey });
  const wallets = CrossmintWallets.from(crossmint);

  console.log(`Creating COMPANY treasury wallet on ${chain} (alias: ${alias})…`);

  const wallet = await wallets.createWallet({
    chain,
    owner: "COMPANY",
    alias,
    recovery: { type: "server", secret: signerSecret },
    signers: [{ type: "server", secret: signerSecret }],
  });

  console.log("\nTreasury wallet created.\n");
  console.log(`Address: ${wallet.address}`);
  console.log(`Alias:   ${alias}`);
  console.log(`Owner:   COMPANY (visible under Wallets → Company in Crossmint Console)`);

  await wallet.useSigner({ type: "server", secret: signerSecret });
  console.log("\nServer signer verified — operational signing works.");

  const balances = await wallet.balances(["usdxm", "usdc"]);
  console.log("\nCurrent balances:", JSON.stringify(balances, null, 2));

  console.log("\n── Add these to .env.local ──────────────────────────────────────\n");
  console.log(`NEXT_PUBLIC_CROSSMINT_TREASURY_WALLET_ADDRESS=${wallet.address}`);
  console.log(`NEXT_PUBLIC_CROSSMINT_TREASURY_WALLET_ALIAS=${alias}`);
  console.log("# Remove NEXT_PUBLIC_CROSSMINT_TREASURY_WALLET_USER_ID — not used for company treasuries");
  console.log("\nKeep CROSSMINT_SERVER_API_KEY and CROSSMINT_SIGNER_SECRET unchanged.");
  console.log(
    "\nVerify in Console: https://staging.crossmint.com/console → Wallets → Company tab",
  );
}

main().catch((error) => {
  console.error("\nTreasury creation failed:");
  console.error(error instanceof Error ? error.message : error);
  console.error(
    "\nIf the alias already exists, set NEXT_PUBLIC_CROSSMINT_TREASURY_WALLET_ADDRESS to that wallet in .env.local instead.",
  );
  process.exit(1);
});
