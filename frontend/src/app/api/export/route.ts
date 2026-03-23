import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const [workplaces, shifts, auditLogs] = await Promise.all([
      prisma.workplace.findMany({ orderBy: { createdAt: "asc" } }),
      prisma.shift.findMany({ orderBy: { date: "asc" } }),
      prisma.auditLog.findMany({ orderBy: { createdAt: "asc" } }),
    ]);

    const today = new Date().toISOString().split("T")[0];
    const filename = `agendor-backup-${today}.json`;

    const payload = JSON.stringify({ workplaces, shifts, auditLogs }, null, 2);

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
