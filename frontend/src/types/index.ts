import type { Workplace, Shift, AuditLog, Prisma } from "@prisma/client";

// Re-exports
export type { Workplace, Shift, AuditLog };

// Relations
export type WorkplaceWithShifts = Workplace & {
  shifts: Shift[];
};

export type ShiftWithWorkplace = Shift & {
  workplace: Workplace;
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
  status?: "scheduled" | "completed" | "cancelled";
  notes?: string;
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
