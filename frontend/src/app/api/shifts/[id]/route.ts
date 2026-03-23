import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import * as shiftService from "@/services/shift.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const shift = await shiftService.getShift(params.id);
    return NextResponse.json(shift, { status: 200 });
  } catch (err) {
    if (err instanceof Error && err.message.includes("não encontrado")) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    console.error("[GET /api/shifts/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const shift = await shiftService.updateShift(params.id, body);
    return NextResponse.json(shift, { status: 200 });
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
    console.error("[PUT /api/shifts/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const { action, actualValue } = body as {
      action: "complete" | "cancel";
      actualValue?: number;
    };

    if (action === "complete") {
      const shift = await shiftService.completeShift(params.id, actualValue);
      return NextResponse.json(shift, { status: 200 });
    }

    if (action === "cancel") {
      const shift = await shiftService.cancelShift(params.id);
      return NextResponse.json(shift, { status: 200 });
    }

    return NextResponse.json(
      { error: 'action deve ser "complete" ou "cancel"' },
      { status: 400 }
    );
  } catch (err) {
    if (err instanceof Error && err.message.includes("não encontrado")) {
      return NextResponse.json({ error: err.message }, { status: 404 });
    }
    console.error("[PATCH /api/shifts/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
