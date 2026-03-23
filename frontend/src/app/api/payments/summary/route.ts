import { NextRequest, NextResponse } from "next/server";
import * as paymentService from "@/services/payment.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    const summary = await paymentService.getFinanceSummary(
      month ? parseInt(month) : undefined,
      year ? parseInt(year) : undefined
    );

    return NextResponse.json(summary, { status: 200 });
  } catch (err) {
    console.error("[GET /api/payments/summary]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
