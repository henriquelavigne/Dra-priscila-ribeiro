import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import * as shiftService from "@/services/shift.service";

const MONTH_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function monthRange(year: number, month: number) {
  return {
    gte: new Date(Date.UTC(year, month - 1, 1)),
    lt: new Date(Date.UTC(year, month, 1)),
  };
}

function prevMonth(year: number, month: number, n: number) {
  let m = month - n;
  let y = year;
  while (m <= 0) { m += 12; y--; }
  return { month: m, year: y };
}

export async function GET() {
  try {
    const now = new Date();
    const currentMonth = now.getUTCMonth() + 1;
    const currentYear = now.getUTCFullYear();

    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;

    const monthStart = new Date(Date.UTC(currentYear, currentMonth - 1, 1));
    const monthEnd = new Date(Date.UTC(currentYear, currentMonth, 1));

    // Last 3 months (including current) for chart
    const chartMonths = [
      prevMonth(currentYear, currentMonth, 2),
      prevMonth(currentYear, currentMonth, 1),
      { month: currentMonth, year: currentYear },
    ];

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
      prisma.shift.findMany({
        where: { status: "completed", date: { gte: monthStart, lt: monthEnd } },
        select: { actualValue: true, expectedValue: true },
      }),
      prisma.payment.findMany({
        where: { paymentDate: { gte: monthStart, lt: monthEnd } },
        select: { amountReceived: true },
      }),
      prisma.autoNote.count({ where: { status: "active" } }),
      prisma.shift.findMany({
        where: { status: "completed" },
        select: {
          actualValue: true,
          expectedValue: true,
          payment: { select: { amountReceived: true, status: true } },
        },
      }),
    ]);

    // Revenue chart: expected + received for each of the last 3 months
    const revenueChart = await Promise.all(
      chartMonths.map(async ({ month, year }) => {
        const range = monthRange(year, month);

        const [shiftsInMonth, paymentsInMonth] = await Promise.all([
          prisma.shift.findMany({
            where: { date: range, status: { in: ["scheduled", "completed"] } },
            select: { expectedValue: true },
          }),
          prisma.payment.findMany({
            where: { shift: { date: range } },
            select: { amountReceived: true },
          }),
        ]);

        return {
          month,
          year,
          monthLabel: MONTH_SHORT[month - 1],
          expected: shiftsInMonth.reduce((s, sh) => s + Number(sh.expectedValue), 0),
          received: paymentsInMonth.reduce((s, p) => s + Number(p.amountReceived), 0),
        };
      })
    );

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

    const totalPending = allPendingShifts.reduce((sum, s) => {
      const ref = Number(s.actualValue ?? s.expectedValue);
      const received = s.payment ? Number(s.payment.amountReceived) : 0;
      if (!s.payment || s.payment.status !== "paid") return sum + (ref - received);
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
        revenueChart,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[GET /api/dashboard]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
