import { prisma } from "@/lib/prisma";
import { workplaceSchema, updateWorkplaceSchema } from "@/lib/validators";
import { logChange } from "./audit.service";
import type { CreateWorkplaceInput, UpdateWorkplaceInput } from "@/types";

export async function listWorkplaces(activeOnly?: boolean) {
  return prisma.workplace.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { autoNotes: { where: { status: "active" } } },
      },
    },
  });
}

export async function getWorkplace(id: string) {
  const workplace = await prisma.workplace.findUnique({
    where: { id },
    include: {
      _count: { select: { shifts: true } },
    },
  });

  if (!workplace) {
    throw new Error(`Local de trabalho não encontrado: ${id}`);
  }

  return workplace;
}

export async function createWorkplace(data: CreateWorkplaceInput) {
  const validated = workplaceSchema.parse(data);

  const colorConflict = await prisma.workplace.findFirst({
    where: { color: validated.color, isActive: true },
  });

  if (colorConflict) {
    throw new Error(
      `A cor ${validated.color} já está em uso pelo local "${colorConflict.name}". Escolha outra cor.`
    );
  }

  const workplace = await prisma.workplace.create({
    data: {
      name: validated.name,
      color: validated.color,
      averageValue: validated.averageValue,
      paymentDeadlineDays: validated.paymentDeadlineDays,
      notes: validated.notes,
    },
  });

  await logChange({
    entityType: "workplace",
    entityId: workplace.id,
    action: "create",
    changes: workplace,
  });

  return workplace;
}

export async function updateWorkplace(id: string, data: UpdateWorkplaceInput) {
  const validated = updateWorkplaceSchema.parse(data);

  const existing = await prisma.workplace.findUnique({ where: { id } });
  if (!existing) {
    throw new Error(`Local de trabalho não encontrado: ${id}`);
  }

  if (validated.color && validated.color !== existing.color) {
    const colorConflict = await prisma.workplace.findFirst({
      where: { color: validated.color, isActive: true, NOT: { id } },
    });

    if (colorConflict) {
      throw new Error(
        `A cor ${validated.color} já está em uso pelo local "${colorConflict.name}". Escolha outra cor.`
      );
    }
  }

  const updated = await prisma.workplace.update({
    where: { id },
    data: {
      ...(validated.name !== undefined && { name: validated.name }),
      ...(validated.color !== undefined && { color: validated.color }),
      ...(validated.averageValue !== undefined && {
        averageValue: validated.averageValue,
      }),
      ...(validated.paymentDeadlineDays !== undefined && {
        paymentDeadlineDays: validated.paymentDeadlineDays,
      }),
      ...(validated.notes !== undefined && { notes: validated.notes }),
      ...(validated.isActive !== undefined && { isActive: validated.isActive }),
    },
  });

  await logChange({
    entityType: "workplace",
    entityId: id,
    action: "update",
    changes: { before: existing, after: updated },
  });

  return updated;
}

export async function deactivateWorkplace(id: string) {
  const existing = await prisma.workplace.findUnique({ where: { id } });
  if (!existing) {
    throw new Error(`Local de trabalho não encontrado: ${id}`);
  }

  await prisma.workplace.update({
    where: { id },
    data: { isActive: false },
  });

  await logChange({
    entityType: "workplace",
    entityId: id,
    action: "update",
    changes: { before: { isActive: true }, after: { isActive: false } },
  });

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const futureShifts = await prisma.shift.findMany({
    where: {
      workplaceId: id,
      status: "scheduled",
      date: { gte: today },
    },
    orderBy: { date: "asc" },
  });

  return futureShifts;
}

export async function reactivateWorkplace(id: string) {
  const existing = await prisma.workplace.findUnique({ where: { id } });
  if (!existing) {
    throw new Error(`Local de trabalho não encontrado: ${id}`);
  }

  const updated = await prisma.workplace.update({
    where: { id },
    data: { isActive: true },
  });

  await logChange({
    entityType: "workplace",
    entityId: id,
    action: "update",
    changes: { before: { isActive: false }, after: { isActive: true } },
  });

  return updated;
}
