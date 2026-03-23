// Tipos standalone (sem dependência do Prisma)

export type ShiftStatus = "scheduled" | "completed" | "cancelled";
export type PaymentStatus = "pending" | "partial" | "paid" | "overdue";
export type AutoNoteStatus = "active" | "resolved";

export interface Workplace {
  id: string;
  name: string;
  color: string;
  averageValue: number;
  paymentDeadlineDays: number;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Shift {
  id: string;
  workplaceId: string;
  date: string;
  expectedValue: number;
  actualValue: number | null;
  status: ShiftStatus;
  notes: string | null;
  source: string;
  sourceDetail: string | null;
  createdAt: string;
  updatedAt: string;
  workplace?: Workplace;
  payment?: Payment | null;
}

export interface Payment {
  id: string;
  shiftId: string;
  amountReceived: number;
  paymentDate: string;
  status: PaymentStatus;
  notes: string | null;
  createdAt: string;
  shift?: Shift & { workplace?: Workplace };
}

export interface AutoNote {
  id: string;
  workplaceId: string;
  shiftId: string;
  type: string;
  message: string;
  amountPending: number;
  status: AutoNoteStatus;
  dueDate: string;
  createdAt: string;
  resolvedAt: string | null;
  workplace?: Workplace;
  shift?: Shift;
}

export interface FinanceSummary {
  totalExpected: number;
  totalReceived: number;
  totalPending: number;
  overdueCount: number;
  partialCount: number;
}

export interface DashboardResponse {
  currentMonthRevenue: number;
  nextMonthRevenue: number;
  currentMonthShiftCount: number;
  upcomingShifts: (Shift & { workplace: Workplace })[];
  currentMonthConfirmedRevenue: number;
  currentMonthReceived: number;
  totalPending: number;
  activeAutoNotesCount: number;
  revenueChart: Array<{
    month: string;
    expected: number;
    received: number;
  }>;
}

// Inputs
export interface CreateShiftInput {
  workplaceId: string;
  date: string;
  expectedValue: number;
  notes?: string;
}

export interface CreatePaymentInput {
  shiftId: string;
  amountReceived: number;
  paymentDate: string;
  notes?: string;
}
