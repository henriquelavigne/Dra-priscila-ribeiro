import { prisma } from "@/lib/prisma";
import { logChange } from "./audit.service";
import type { AutoNoteWithDetails } from "@/types";

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

function formatDatePTBR(date: Date): string {
  return date.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

function formatCurrencyBR(value: number): string {
  return value.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// ---------- checkAndGenerateAutoNotes ----------

export async function checkAndGenerateAutoNotes(): Promise<{
  created: number;
  updated: number;
  resolved: number;
}> {
  const today = todayUTC();
  const now = new Date();
  let created = 0;
  let updated = 0;
  let resolved = 0;

  // All completed shifts without a "paid" payment
  const shifts = await prisma.shift.findMany({
    where: {
      status: "completed",
      OR: [
        { payment: null },
        { payment: { status: { not: "paid" } } },
      ],
    },
    include: {
      workplace: true,
      payment: true,
      autoNotes: { where: { status: "active" } },
    },
  });

  for (const shift of shifts) {
    const dueDate = addDays(shift.date as Date, shift.workplace.paymentDeadlineDays);
    const referenceAmount = Number(shift.actualValue ?? shift.expectedValue);
    const activeNote = shift.autoNotes[0] ?? null;

    // Case 1: partial payment received
    if (shift.payment?.status === "partial") {
      const pending = referenceAmount - Number(shift.payment.amountReceived);

      if (activeNote) {
        await prisma.autoNote.update({
          where: { id: activeNote.id },
          data: { type: "partial_payment", amountPending: pending },
        });
        updated++;
      }
      // If no active note, syncAutoNotesAfterPayment in payment.service handles creation
      continue;
    }

    // Case 2: no payment and overdue
    if (!shift.payment && dueDate < today) {
      if (!activeNote) {
        const dateLabel = formatDatePTBR(shift.date as Date);
        await prisma.autoNote.create({
          data: {
            workplaceId: shift.workplaceId,
            shiftId: shift.id,
            type: "payment_overdue",
            message: `Pagamento do plantão de ${dateLabel} em ${shift.workplace.name} está atrasado. Valor pendente: R$ ${formatCurrencyBR(referenceAmount)}`,
            amountPending: referenceAmount,
            dueDate,
            status: "active",
          },
        });
        created++;
      }
    }
  }

  // Case 3: shifts that got fully paid but still have active auto-notes
  const paidShiftsWithActiveNotes = await prisma.autoNote.findMany({
    where: {
      status: "active",
      shift: { payment: { status: "paid" } },
    },
    select: { id: true },
  });

  if (paidShiftsWithActiveNotes.length > 0) {
    await prisma.autoNote.updateMany({
      where: { id: { in: paidShiftsWithActiveNotes.map((n) => n.id) } },
      data: { status: "resolved", resolvedAt: now },
    });
    resolved += paidShiftsWithActiveNotes.length;
  }

  return { created, updated, resolved };
}

// ---------- listAutoNotes ----------

type NoteStatus = "active" | "resolved" | "all";

export async function listAutoNotes(status: NoteStatus = "active"): Promise<AutoNoteWithDetails[]> {
  const where = status === "all" ? {} : { status };

  return prisma.autoNote.findMany({
    where,
    include: {
      workplace: true,
      shift: { include: { workplace: true } },
    },
    orderBy: { dueDate: "asc" },
  }) as Promise<AutoNoteWithDetails[]>;
}

// ---------- listAutoNotesGroupedByWorkplace ----------

interface AutoNoteGroup {
  workplace: { id: string; name: string; color: string };
  totalPending: number;
  overdueCount: number;
  oldestDueDate: Date;
  notes: AutoNoteWithDetails[];
}

export async function listAutoNotesGroupedByWorkplace(
  status: NoteStatus = "active"
): Promise<AutoNoteGroup[]> {
  const notes = await listAutoNotes(status);

  const groupMap = new Map<string, AutoNoteGroup>();

  for (const note of notes) {
    const wpId = note.workplace.id;
    const existing = groupMap.get(wpId);

    if (existing) {
      existing.totalPending += Number(note.amountPending);
      existing.overdueCount++;
      if (note.dueDate < existing.oldestDueDate) {
        existing.oldestDueDate = note.dueDate;
      }
      existing.notes.push(note);
    } else {
      groupMap.set(wpId, {
        workplace: {
          id: note.workplace.id,
          name: note.workplace.name,
          color: note.workplace.color,
        },
        totalPending: Number(note.amountPending),
        overdueCount: 1,
        oldestDueDate: note.dueDate,
        notes: [note],
      });
    }
  }

  return Array.from(groupMap.values()).sort((a, b) => b.totalPending - a.totalPending);
}

// ---------- resolveAutoNote ----------

export async function resolveAutoNote(id: string) {
  const note = await prisma.autoNote.findUnique({ where: { id } });
  if (!note) throw new Error("Nota não encontrada");

  const updated = await prisma.autoNote.update({
    where: { id },
    data: { status: "resolved", resolvedAt: new Date() },
  });

  await logChange({
    entityType: "auto_note",
    entityId: id,
    action: "update",
    changes: { before: { status: note.status }, after: { status: "resolved" } },
  });

  return updated;
}
