import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import * as shiftService from "@/services/shift.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const month = searchParams.get("month");
    const year = searchParams.get("year");
    const workplaceId = searchParams.get("workplaceId") ?? undefined;
    const status = searchParams.get("status") ?? undefined;

    const shifts = await shiftService.listShifts({
      month: month ? parseInt(month) : undefined,
      year: year ? parseInt(year) : undefined,
      workplaceId,
      status,
    });

    return NextResponse.json(shifts, { status: 200 });
  } catch (err) {
    console.error("[GET /api/shifts]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const shift = await shiftService.createShift(body);
    return NextResponse.json(shift, { status: 201 });
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
    if (err instanceof Error && err.message.includes("inativo")) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("[POST /api/shifts]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
