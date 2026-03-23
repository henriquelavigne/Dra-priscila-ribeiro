import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { prisma } from "@/lib/prisma";
import * as paymentService from "@/services/payment.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const payment = await prisma.payment.findUnique({
      where: { id: params.id },
      include: { shift: { include: { workplace: true } } },
    });
    if (!payment) {
      return NextResponse.json({ error: "Pagamento não encontrado" }, { status: 404 });
    }
    return NextResponse.json(payment, { status: 200 });
  } catch (err) {
    console.error("[GET /api/payments/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const payment = await paymentService.updatePayment(params.id, body);
    return NextResponse.json(payment, { status: 200 });
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Validation error", details: err.issues },
        { status: 400 }
      );
    }
    if (err instanceof Error && err.message.includes("não encontrado")) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    console.error("[PUT /api/payments/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
