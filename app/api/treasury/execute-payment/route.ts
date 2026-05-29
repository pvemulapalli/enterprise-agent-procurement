import { NextResponse } from "next/server";

import { getPaymentToken } from "@/lib/crossmint/payment";
import {
  demoTreasuryBalance,
  demoTreasuryDelay,
  simulateDemoTreasuryPayment,
  TREASURY_WALLET_DEMO_MODE,
} from "@/lib/crossmint/treasury-demo";
import { executeCorporateTreasuryPayment } from "@/lib/crossmint/server-treasury";
import { SHI_VENDOR_TREASURY_ADDRESS } from "@/lib/procurement/lilys-boutique";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      amount?: number;
      recipient?: string;
      balanceBefore?: number;
    };

    const amount = body.amount;
    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "Invalid payment amount." }, { status: 400 });
    }

    const recipient = body.recipient ?? SHI_VENDOR_TREASURY_ADDRESS;

    if (TREASURY_WALLET_DEMO_MODE) {
      await demoTreasuryDelay();
      const token = getPaymentToken();
      const balanceBefore =
        typeof body.balanceBefore === "number"
          ? body.balanceBefore
          : demoTreasuryBalance();
      const result = simulateDemoTreasuryPayment(
        amount,
        recipient,
        token,
        balanceBefore,
      );
      return NextResponse.json(result);
    }

    const result = await executeCorporateTreasuryPayment(amount, recipient);
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Treasury payment failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
