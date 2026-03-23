import { NextRequest, NextResponse } from "next/server";
import * as shiftService from "@/services/shift.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: { date: string } }
) {
  try {
    const shifts = await shiftService.getShiftsByDate(params.date);
    return NextResponse.json(shifts, { status: 200 });
  } catch (err) {
    console.error("[GET /api/shifts/by-date/[date]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
