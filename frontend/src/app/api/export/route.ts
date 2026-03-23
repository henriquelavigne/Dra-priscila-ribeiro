import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [workplaces, shifts, payments, autoNotes, auditLog] = await Promise.all([
      prisma.workplace.findMany({ orderBy: { name: "asc" } }),
      prisma.shift.findMany({
        orderBy: { date: "asc" },
        include: { workplace: { select: { name: true } } },
      }),
      prisma.payment.findMany({
        orderBy: { createdAt: "asc" },
        include: {
          shift: {
            select: {
              date: true,
              workplace: { select: { name: true } },
            },
          },
        },
      }),
      prisma.autoNote.findMany({
        orderBy: { createdAt: "asc" },
        include: {
          shift: {
            select: {
              date: true,
              workplace: { select: { name: true } },
            },
          },
        },
      }),
      prisma.auditLog.findMany({ orderBy: { createdAt: "asc" } }),
    ]);

    const now = new Date();
    const exportDate = now
      .toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })
      .replace(",", "");

    const today = now.toISOString().split("T")[0];
    const filename = `agendor-backup-${today}.json`;

    const payload = JSON.stringify(
      {
        exportDate,
        appName: "Dra. Priscila Agendor",
        version: "1.1",
        data: { workplaces, shifts, payments, autoNotes, auditLog },
        summary: {
          totalWorkplaces: workplaces.length,
          totalShifts: shifts.length,
          totalPayments: payments.length,
          activeAutoNotes: autoNotes.filter((n) => n.status === "active").length,
        },
      },
      null,
      2
    );

    return new NextResponse(payload, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    console.error("[GET /api/export]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
