import { prisma } from "@/lib/prisma";
import { paymentSchema } from "@/lib/validators";
import { logChange } from "./audit.service";
import type { CreatePaymentInput, FinanceFilters, FinanceSummary, ShiftWithPaymentStatus } from "@/types";

// Helper: add days to a Date, returning UTC midnight
function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
}

// Determine payment status from received vs reference amount
function derivePaymentStatus(amountReceived: number, referenceAmount: number): "paid" | "partial" {
  return amountReceived >= referenceAmount ? "paid" : "partial";
}

// ---------- getPaymentByShift ----------

export async function getPaymentByShift(shiftId: string) {
  return prisma.payment.findUnique({ where: { shiftId } });
}

// ---------- registerPayment ----------

export async function registerPayment(data: CreatePaymentInput) {
  const validated = paymentSchema.parse(data);

  const shift = await prisma.shift.findUnique({
    where: { id: validated.shiftId },
    include: { workplace: true },
  });

  if (!shift) throw new Error("Plantão não encontrado");

  if (shift.status !== "completed") {
    throw new Error("Só é possível registrar pagamento de plantões realizados");
  }

  const existing = await prisma.payment.findUnique({
    where: { shiftId: validated.shiftId },
  });
  if (existing) {
    throw new Error("Pagamento já registrado para este plantão. Use a edição.");
  }

  const referenceAmount = Number(shift.actualValue ?? shift.expectedValue);
  const status = derivePaymentStatus(validated.amountReceived, referenceAmount);

  const [year, month, day] = validated.paymentDate.split("-").map(Number);
  const paymentDate = new Date(Date.UTC(year, month - 1, day));

  const payment = await prisma.payment.create({
    data: {
      shiftId: validated.shiftId,
      amountReceived: validated.amountReceived,
      paymentDate,
      status,
      notes: validated.notes,
    },
    include: { shift: { include: { workplace: true } } },
  });

  await logChange({
    entityType: "payment",
    entityId: payment.id,
    action: "create",
    changes: payment,
  });

  // Update auto-notes
  await syncAutoNotesAfterPayment(validated.shiftId, shift.workplaceId, status, validated.amountReceived, referenceAmount, shift.date as Date, shift.workplace.paymentDeadlineDays);

  return payment;
}

// ---------- updatePayment ----------

export async function updatePayment(
  id: string,
  data: { amountReceived: number; paymentDate?: string; notes?: string }
) {
  const existing = await prisma.payment.findUnique({
    where: { id },
    include: { shift: { include: { workplace: true } } },
  });
  if (!existing) throw new Error("Pagamento não encontrado");

  const referenceAmount = Number(
    existing.shift.actualValue ?? existing.shift.expectedValue
  );
  const status = derivePaymentStatus(data.amountReceived, referenceAmount);

  const updateData: Record<string, unknown> = {
    amountReceived: data.amountReceived,
    status,
  };
  if (data.paymentDate) {
    const [y, m, d] = data.paymentDate.split("-").map(Number);
    updateData.paymentDate = new Date(Date.UTC(y, m - 1, d));
  }
  if (data.notes !== undefined) updateData.notes = data.notes;

  const updated = await prisma.payment.update({
    where: { id },
    data: updateData,
    include: { shift: { include: { workplace: true } } },
  });

  await logChange({
    entityType: "payment",
    entityId: id,
    action: "update",
    changes: { before: existing, after: updated },
  });

  await syncAutoNotesAfterPayment(
    existing.shiftId,
    existing.shift.workplaceId,
    status,
    data.amountReceived,
    referenceAmount,
    existing.shift.date as Date,
    existing.shift.workplace.paymentDeadlineDays
  );

  return updated;
}

// ---------- syncAutoNotesAfterPayment (internal helper) ----------

async function syncAutoNotesAfterPayment(
  shiftId: string,
  workplaceId: string,
  paymentStatus: "paid" | "partial",
  amountReceived: number,
  referenceAmount: number,
  shiftDate: Date,
  paymentDeadlineDays: number
) {
  const now = new Date();

  if (paymentStatus === "paid") {
    // Resolve all active auto-notes for this shift
    await prisma.autoNote.updateMany({
      where: { shiftId, status: "active" },
      data: { status: "resolved", resolvedAt: now },
    });
  } else {
    // partial payment
    const pending = referenceAmount - amountReceived;
    const dueDate = addDays(shiftDate, paymentDeadlineDays);
    const dateLabel = (shiftDate as Date).toLocaleDateString("pt-BR", { timeZone: "UTC" });

    const [activeNote] = await prisma.autoNote.findMany({
      where: { shiftId, status: "active" },
      take: 1,
    });

    if (activeNote) {
      await prisma.autoNote.update({
        where: { id: activeNote.id },
        data: {
          type: "partial_payment",
          amountPending: pending,
        },
      });
    } else {
      const workplace = await prisma.workplace.findUnique({ where: { id: workplaceId } });
      await prisma.autoNote.create({
        data: {
          workplaceId,
          shiftId,
          type: "partial_payment",
          message: `Pagamento parcial do plantão de ${dateLabel} em ${workplace?.name ?? ""}. Valor pendente: R$ ${pending.toFixed(2).replace(".", ",")}`,
          amountPending: pending,
          dueDate,
          status: "active",
        },
      });
    }
  }
}

// ---------- listPaymentsWithShifts ----------

export async function listPaymentsWithShifts(
  filters: FinanceFilters
): Promise<ShiftWithPaymentStatus[]> {
  const where: Record<string, unknown> = {
    status: "completed",
  };

  if (filters.workplaceId) where.workplaceId = filters.workplaceId;

  if (filters.month && filters.year) {
    where.date = {
      gte: new Date(Date.UTC(filters.year, filters.month - 1, 1)),
      lt: new Date(Date.UTC(filters.year, filters.month, 1)),
    };
  } else if (filters.year) {
    where.date = {
      gte: new Date(Date.UTC(filters.year, 0, 1)),
      lt: new Date(Date.UTC(filters.year + 1, 0, 1)),
    };
  }

  const shifts = await prisma.shift.findMany({
    where,
    include: {
      workplace: true,
      payment: true,
    },
    orderBy: { date: "desc" },
  });

  const today = todayUTC();

  return shifts
    .map((shift) => {
      let paymentStatus: ShiftWithPaymentStatus["paymentStatus"];

      if (shift.payment?.status === "paid") {
        paymentStatus = "paid";
      } else if (shift.payment?.status === "partial") {
        paymentStatus = "partial";
      } else if (!shift.payment) {
        const deadline = addDays(shift.date as Date, shift.workplace.paymentDeadlineDays);
        paymentStatus = deadline < today ? "overdue" : "on_schedule";
      } else {
        paymentStatus = "not_due";
      }

      // Filter by paymentStatus if requested
      if (filters.status && filters.status !== "all") {
        if (filters.status === "paid" && paymentStatus !== "paid") return null;
        if (filters.status === "pending" && paymentStatus === "paid") return null;
      }

      return { ...shift, paymentStatus };
    })
    .filter(Boolean) as ShiftWithPaymentStatus[];
}

// ---------- getFinanceSummary ----------

export async function getFinanceSummary(month?: number, year?: number): Promise<FinanceSummary> {
  // Shifts in period for expected/received
  const periodWhere: Record<string, unknown> = { status: "completed" };
  if (month && year) {
    periodWhere.date = {
      gte: new Date(Date.UTC(year, month - 1, 1)),
      lt: new Date(Date.UTC(year, month, 1)),
    };
  } else if (year) {
    periodWhere.date = {
      gte: new Date(Date.UTC(year, 0, 1)),
      lt: new Date(Date.UTC(year + 1, 0, 1)),
    };
  }

  const periodShifts = await prisma.shift.findMany({
    where: periodWhere,
    include: { payment: true },
  });

  const totalExpected = periodShifts.reduce(
    (sum, s) => sum + Number(s.actualValue ?? s.expectedValue),
    0
  );
  const totalReceived = periodShifts.reduce(
    (sum, s) => sum + (s.payment ? Number(s.payment.amountReceived) : 0),
    0
  );
  const totalPending = totalExpected - totalReceived;

  // Global overdue and partial counts (all time)
  const allCompletedShifts = await prisma.shift.findMany({
    where: { status: "completed" },
    include: { workplace: true, payment: true },
  });

  const today = todayUTC();
  let overdueCount = 0;
  let partialCount = 0;

  for (const s of allCompletedShifts) {
    if (s.payment?.status === "partial") {
      partialCount++;
    } else if (!s.payment) {
      const deadline = addDays(s.date as Date, s.workplace.paymentDeadlineDays);
      if (deadline < today) overdueCount++;
    }
  }

  return { totalExpected, totalReceived, totalPending, overdueCount, partialCount };
}
