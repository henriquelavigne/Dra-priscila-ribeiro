import type { Workplace, Shift, AuditLog, Payment, AutoNote, Prisma, ShiftStatus, PaymentStatus, AutoNoteStatus } from "@prisma/client";

// Re-exports
export type { Workplace, Shift, AuditLog, Payment, AutoNote, ShiftStatus, PaymentStatus, AutoNoteStatus };

// Relations
export type WorkplaceWithShifts = Workplace & {
  shifts: Shift[];
};

export type ShiftWithWorkplace = Shift & {
  workplace: Workplace;
};

export type PaymentWithShift = Payment & {
  shift: Shift & {
    workplace: Workplace;
  };
};

export type AutoNoteWithDetails = AutoNote & {
  workplace: Workplace;
  shift: Shift & {
    workplace: Workplace;
  };
};

export type ShiftWithPaymentStatus = Shift & {
  workplace: Workplace;
  payment: Payment | null;
  paymentStatus: "paid" | "partial" | "overdue" | "on_schedule" | "not_due";
};

// Inputs
export type CreateWorkplaceInput = {
  name: string;
  color: string;
  averageValue: number;
  paymentDeadlineDays: number;
  notes?: string;
};

export type UpdateWorkplaceInput = Partial<CreateWorkplaceInput> & {
  isActive?: boolean;
};

export type CreateShiftInput = {
  workplaceId: string;
  date: string; // ISO date string "YYYY-MM-DD"
  expectedValue: number;
  notes?: string;
};

export type UpdateShiftInput = {
  date?: string;
  expectedValue?: number;
  actualValue?: number;
  status?: ShiftStatus;
  notes?: string;
};

export type CreatePaymentInput = {
  shiftId: string;
  amountReceived: number;
  paymentDate: string; // ISO date string "YYYY-MM-DD"
  notes?: string;
};

// Finance
export type FinanceFilters = {
  status?: "all" | "pending" | "paid";
  month?: number;
  year?: number;
  workplaceId?: string;
};

export type FinanceSummary = {
  totalExpected: number;
  totalReceived: number;
  totalPending: number;
  overdueCount: number;
  partialCount: number;
};

// Dashboard
export type DashboardData = {
  period: {
    month: number;
    year: number;
    label: string;
  };
  summary: {
    totalScheduled: number;
    totalCompleted: number;
    totalCancelled: number;
    expectedRevenue: Prisma.Decimal | number;
    actualRevenue: Prisma.Decimal | number;
    pendingPayments: Prisma.Decimal | number;
  };
  byWorkplace: Array<{
    workplace: Workplace;
    shiftsCount: number;
    expectedRevenue: Prisma.Decimal | number;
    actualRevenue: Prisma.Decimal | number;
  }>;
  upcomingShifts: ShiftWithWorkplace[];
  recentShifts: ShiftWithWorkplace[];
};
