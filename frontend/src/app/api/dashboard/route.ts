import { NextResponse } from "next/server";
import * as shiftService from "@/services/shift.service";

export async function GET() {
  try {
    const now = new Date();
    const currentMonth = now.getUTCMonth() + 1;
    const currentYear = now.getUTCFullYear();

    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;

    const [
      currentMonthRevenue,
      nextMonthRevenue,
      currentMonthShifts,
      upcomingShifts,
    ] = await Promise.all([
      shiftService.getMonthlyRevenue(currentMonth, currentYear),
      shiftService.getMonthlyRevenue(nextMonth, nextYear),
      shiftService.listShifts({
        month: currentMonth,
        year: currentYear,
        status: undefined,
      }),
      shiftService.getUpcomingShifts(5),
    ]);

    const currentMonthShiftCount = currentMonthShifts.filter(
      (s) => s.status === "scheduled" || s.status === "completed"
    ).length;

    return NextResponse.json(
      {
        currentMonthRevenue,
        nextMonthRevenue,
        currentMonthShiftCount,
        upcomingShifts,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[GET /api/dashboard]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
