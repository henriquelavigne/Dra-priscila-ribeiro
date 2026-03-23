import { ShiftStatus as PrismaShiftStatus } from "@prisma/client";

export const COLOR_PALETTE: string[] = [
  "#2563EB", // azul
  "#DC2626", // vermelho
  "#16A34A", // verde
  "#7C3AED", // roxo
  "#EA580C", // laranja
  "#DB2777", // rosa
  "#0D9488", // teal
  "#4338CA", // índigo
  "#CA8A04", // amarelo-escuro
  "#92400E", // marrom
  "#65A30D", // verde-limão
  "#0891B2", // ciano
  "#C026D3", // magenta
  "#E11D48", // coral
  "#059669", // verde-esmeralda
  "#0E7490", // azul-petróleo
];

export const SHIFT_STATUS = {
  SCHEDULED: PrismaShiftStatus.scheduled,
  COMPLETED: PrismaShiftStatus.completed,
  CANCELLED: PrismaShiftStatus.cancelled,
} as const;

export type ShiftStatus = (typeof SHIFT_STATUS)[keyof typeof SHIFT_STATUS];

export const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];

export const MONTH_NAMES_SHORT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

