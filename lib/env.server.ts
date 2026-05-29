/** Server-only environment (never import from client components). */
export const serverEnv = {
  crossmint: {
    serverApiKey: process.env.CROSSMINT_SERVER_API_KEY,
    /** Self-generated when creating the company treasury — not retrieved from Console. */
    signerSecret: process.env.CROSSMINT_SIGNER_SECRET,
  },
} as const;

export function requireCrossmintServerApiKey(): string {
  const apiKey = serverEnv.crossmint.serverApiKey;
  if (!apiKey) {
    throw new Error(
      "Missing CROSSMINT_SERVER_API_KEY. Required for company treasury balance and payments.",
    );
  }
  return apiKey;
}
