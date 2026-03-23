import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as shiftService from "@/services/shift.service";

export async function GET() {
  try {
    const now = new Date();
    const currentMonth = now.getUTCMonth() + 1;
    const currentYear = now.getUTCFullYear();

    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;

    const monthStart = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
    const monthEnd = new Date(Date.UTC(currentYear, currentMonth, 1));

    const [
      currentMonthRevenue,
      nextMonthRevenue,
      currentMonthShifts,
      upcomingShifts,
      completedThisMonth,
      paymentsThisMonth,
      allActiveAutoNotes,
      allPendingShifts,
    ] = await Promise.all([
      shiftService.getMonthlyRevenue(currentMonth, currentYear),
      shiftService.getMonthlyRevenue(nextMonth, nextYear),
      shiftService.listShifts({ month: currentMonth, year: currentYear }),
      shiftService.getUpcomingShifts(5),
      // Completed shifts this month for confirmed revenue
      prisma.shift.findMany({
        where: {
          status: "completed",
          date: { gte: monthStart, lt: monthEnd },
        },
        select: { actualValue: true, expectedValue: true },
      }),
      // Payments registered this month
      prisma.payment.findMany({
        where: {
          paymentDate: { gte: monthStart, lt: monthEnd },
        },
        select: { amountReceived: true },
      }),
      // Active auto-notes count (global)
      prisma.autoNote.count({ where: { status: "active" } }),
      // All completed shifts without full payment for pending total
      prisma.shift.findMany({
        where: { status: "completed" },
        select: {
          actualValue: true,
          expectedValue: true,
          payment: { select: { amountReceived: true, status: true } },
        },
      }),
    ]);

    const currentMonthShiftCount = currentMonthShifts.filter(
      (s) => s.status === "scheduled" || s.status === "completed"
    ).length;

    const currentMonthConfirmedRevenue = completedThisMonth.reduce(
      (sum, s) => sum + Number(s.actualValue ?? s.expectedValue),
      0
    );

    const currentMonthReceived = paymentsThisMonth.reduce(
      (sum, p) => sum + Number(p.amountReceived),
      0
    );

    // Global totalPending: sum of unpaid/partial across all time
    const totalPending = allPendingShifts.reduce((sum, s) => {
      const ref = Number(s.actualValue ?? s.expectedValue);
      const received = s.payment ? Number(s.payment.amountReceived) : 0;
      if (!s.payment || s.payment.status !== "paid") {
        return sum + (ref - received);
      }
      return sum;
    }, 0);

    return NextResponse.json(
      {
        currentMonthRevenue,
        nextMonthRevenue,
        currentMonthShiftCount,
        upcomingShifts,
        currentMonthConfirmedRevenue,
        currentMonthReceived,
        totalPending,
        activeAutoNotesCount: allActiveAutoNotes,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[GET /api/dashboard]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
