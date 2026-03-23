import { prisma } from "@/lib/prisma";
import { shiftSchema, updateShiftSchema } from "@/lib/validators";
import { logChange } from "./audit.service";
import type { CreateShiftInput, UpdateShiftInput } from "@/types";

// Helper: converte string "YYYY-MM-DD" em Date UTC (meia-noite)
function toUTCDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

// Helper: primeiro instante do mês em UTC
function startOfMonthUTC(year: number, month: number): Date {
  return new Date(Date.UTC(year, month - 1, 1));
}

// Helper: primeiro instante do mês seguinte em UTC
function startOfNextMonthUTC(year: number, month: number): Date {
  return new Date(Date.UTC(year, month, 1));
}

interface ListShiftsParams {
  month?: number;
  year?: number;
  workplaceId?: string;
  status?: string;
}

export async function listShifts(params: ListShiftsParams = {}) {
  const { month, year, workplaceId, status } = params;

  const where: Record<string, unknown> = {};

  if (month && year) {
    where.date = {
      gte: startOfMonthUTC(year, month),
      lt: startOfNextMonthUTC(year, month),
    };
  } else if (year) {
    where.date = {
      gte: new Date(Date.UTC(year, 0, 1)),
      lt: new Date(Date.UTC(year + 1, 0, 1)),
    };
  }

  if (workplaceId) where.workplaceId = workplaceId;
  if (status) where.status = status;

  return prisma.shift.findMany({
    where,
    include: {
      workplace: {
        select: { id: true, name: true, color: true },
      },
    },
    orderBy: { date: "asc" },
  });
}

export async function getShift(id: string) {
  const shift = await prisma.shift.findUnique({
    where: { id },
    include: { workplace: true },
  });

  if (!shift) {
    throw new Error(`Plantão não encontrado: ${id}`);
  }

  return shift;
}

export async function getShiftsByDate(date: string) {
  const day = toUTCDate(date);
  const nextDay = new Date(day);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);

  return prisma.shift.findMany({
    where: {
      date: { gte: day, lt: nextDay },
    },
    include: {
      workplace: {
        select: { id: true, name: true, color: true },
      },
    },
    orderBy: { date: "asc" },
  });
}

export async function createShift(data: CreateShiftInput) {
  const validated = shiftSchema.parse(data);

  const workplace = await prisma.workplace.findUnique({
    where: { id: validated.workplaceId },
  });

  if (!workplace) {
    throw new Error(`Local de trabalho não encontrado: ${validated.workplaceId}`);
  }

  if (!workplace.isActive) {
    throw new Error(`O local "${workplace.name}" está inativo.`);
  }

  const expectedValue =
    validated.expectedValue !== undefined
      ? validated.expectedValue
      : Number(workplace.averageValue);

  const shift = await prisma.shift.create({
    data: {
      workplaceId: validated.workplaceId,
      date: toUTCDate(validated.date),
      expectedValue,
      notes: validated.notes,
    },
    include: { workplace: true },
  });

  await logChange({
    entityType: "shift",
    entityId: shift.id,
    action: "create",
    changes: shift,
  });

  return shift;
}

export async function updateShift(id: string, data: UpdateShiftInput) {
  const validated = updateShiftSchema.parse(data);

  const existing = await prisma.shift.findUnique({ where: { id } });
  if (!existing) {
    throw new Error(`Plantão não encontrado: ${id}`);
  }

  const updated = await prisma.shift.update({
    where: { id },
    data: {
      ...(validated.date !== undefined && { date: toUTCDate(validated.date) }),
      ...(validated.expectedValue !== undefined && {
        expectedValue: validated.expectedValue,
      }),
      ...(validated.actualValue !== undefined && {
        actualValue: validated.actualValue,
      }),
      ...(validated.status !== undefined && { status: validated.status }),
      ...(validated.notes !== undefined && { notes: validated.notes }),
    },
    include: { workplace: true },
  });

  await logChange({
    entityType: "shift",
    entityId: id,
    action: "update",
    changes: { before: existing, after: updated },
  });

  return updated;
}

export async function completeShift(id: string, actualValue?: number) {
  const existing = await prisma.shift.findUnique({ where: { id } });
  if (!existing) {
    throw new Error(`Plantão não encontrado: ${id}`);
  }

  const resolvedActualValue =
    actualValue !== undefined ? actualValue : Number(existing.expectedValue);

  const updated = await prisma.shift.update({
    where: { id },
    data: {
      status: "completed",
      actualValue: resolvedActualValue,
    },
    include: { workplace: true },
  });

  await logChange({
    entityType: "shift",
    entityId: id,
    action: "update",
    changes: {
      before: { status: existing.status, actualValue: existing.actualValue },
      after: { status: "completed", actualValue: resolvedActualValue },
    },
  });

  return updated;
}

export async function cancelShift(id: string) {
  const existing = await prisma.shift.findUnique({ where: { id } });
  if (!existing) {
    throw new Error(`Plantão não encontrado: ${id}`);
  }

  const updated = await prisma.shift.update({
    where: { id },
    data: { status: "cancelled" },
    include: { workplace: true },
  });

  await logChange({
    entityType: "shift",
    entityId: id,
    action: "update",
    changes: {
      before: { status: existing.status },
      after: { status: "cancelled" },
    },
  });

  return updated;
}

export async function getMonthlyRevenue(month: number, year: number): Promise<number> {
  const shifts = await prisma.shift.findMany({
    where: {
      date: {
        gte: startOfMonthUTC(year, month),
        lt: startOfNextMonthUTC(year, month),
      },
      status: { in: ["scheduled", "completed"] },
    },
    select: { expectedValue: true },
  });

  return shifts.reduce((sum, s) => sum + Number(s.expectedValue), 0);
}

export async function getUpcomingShifts(limit: number) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  return prisma.shift.findMany({
    where: {
      date: { gte: today },
      status: "scheduled",
    },
    include: {
      workplace: {
        select: { id: true, name: true, color: true },
      },
    },
    orderBy: { date: "asc" },
    take: limit,
  });
}
