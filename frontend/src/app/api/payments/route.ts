import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import * as paymentService from "@/services/payment.service";
import type { FinanceFilters } from "@/types";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const status = searchParams.get("status") ?? undefined;
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const workplaceId = searchParams.get("workplaceId") ?? undefined;

    const filters: FinanceFilters = {
      status: status as FinanceFilters["status"],
      month: month ? parseInt(month) : undefined,
      year: year ? parseInt(year) : undefined,
      workplaceId,
    };

    const shifts = await paymentService.listPaymentsWithShifts(filters);
    return NextResponse.json(shifts, { status: 200 });
  } catch (err) {
    console.error("[GET /api/payments]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payment = await paymentService.registerPayment(body);
    return NextResponse.json(payment, { status: 201 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: err.issues },
        { status: 400 }
      );
    }
    if (err instanceof Error) {
      if (err.message.includes("já registrado")) {
        return NextResponse.json({ error: err.message }, { status: 409 });
      }
      if (err.message.includes("plantões realizados")) {
        return NextResponse.json({ error: err.message }, { status: 422 });
      }
      if (err.message.includes("não encontrado")) {
        return NextResponse.json({ error: err.message }, { status: 404 });
      }
    }
    console.error("[POST /api/payments]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
