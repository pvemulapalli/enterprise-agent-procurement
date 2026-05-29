import { NextResponse } from "next/server";

import { getPaymentToken } from "@/lib/crossmint/payment";
import {
  demoTreasuryBalance,
  TREASURY_WALLET_DEMO_MODE,
} from "@/lib/crossmint/treasury-demo";
import { readCorporateTreasuryBalance } from "@/lib/crossmint/server-treasury";
import { treasuryConfig } from "@/lib/crossmint/treasury-config";

export async function GET() {
  try {
    const balance = TREASURY_WALLET_DEMO_MODE
      ? demoTreasuryBalance()
      : await readCorporateTreasuryBalance();

    return NextResponse.json({
      address: treasuryConfig.address,
      alias: treasuryConfig.alias,
      displayName: treasuryConfig.displayName,
      owner: "COMPANY",
      chain: treasuryConfig.chain,
      token: getPaymentToken(treasuryConfig.chain),
      balance,
      simulated: TREASURY_WALLET_DEMO_MODE,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unable to read treasury balance.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
