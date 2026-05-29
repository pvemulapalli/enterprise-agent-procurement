import { NextResponse } from "next/server";

import { isStagingChain } from "@/lib/crossmint/payment";
import {
  demoTreasuryDelay,
  simulateDemoStagingFund,
  TREASURY_WALLET_DEMO_MODE,
} from "@/lib/crossmint/treasury-demo";
import { fundCorporateTreasuryStagingReserve } from "@/lib/crossmint/server-treasury";
import { treasuryConfig } from "@/lib/crossmint/treasury-config";

export async function POST() {
  try {
    if (!isStagingChain(treasuryConfig.chain)) {
      return NextResponse.json(
        { error: "Staging fund is only available on testnet chains." },
        { status: 400 },
      );
    }

    if (TREASURY_WALLET_DEMO_MODE) {
      await demoTreasuryDelay(800);
      const result = simulateDemoStagingFund();
      return NextResponse.json(result);
    }

    const result = await fundCorporateTreasuryStagingReserve();
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unable to fund treasury.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
