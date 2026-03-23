import { z } from "zod";
import { ShiftStatus } from "@prisma/client";

export const workplaceSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100, "Nome muito longo"),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Cor deve ser um código hex válido (ex: #3B82F6)"),
  averageValue: z
    .number("Valor deve ser um número")
    .positive("Valor deve ser positivo"),
  paymentDeadlineDays: z
    .number("Prazo deve ser um número")
    .int("Prazo deve ser um número inteiro")
    .min(1, "Prazo mínimo é 1 dia")
    .max(365, "Prazo máximo é 365 dias"),
  notes: z.string().optional(),
});

export const updateWorkplaceSchema = workplaceSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const shiftSchema = z.object({
  workplaceId: z.string().uuid("ID do local de trabalho inválido"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
  expectedValue: z
    .number("Valor deve ser um número")
    .positive("Valor deve ser positivo"),
  notes: z.string().optional(),
});

export const updateShiftSchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD")
    .optional(),
  expectedValue: z
    .number("Valor deve ser um número")
    .positive("Valor deve ser positivo")
    .optional(),
  actualValue: z
    .number("Valor deve ser um número")
    .positive("Valor deve ser positivo")
    .optional(),
  status: z.nativeEnum(ShiftStatus).optional(),
  notes: z.string().optional(),
});

export const paymentSchema = z.object({
  shiftId: z.string().uuid("ID do plantão inválido"),
  amountReceived: z
    .number("Valor deve ser um número")
    .positive("Valor deve ser positivo"),
  paymentDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD"),
  notes: z.string().optional(),
});

export type WorkplaceSchema = z.infer<typeof workplaceSchema>;
export type UpdateWorkplaceSchema = z.infer<typeof updateWorkplaceSchema>;
export type ShiftSchema = z.infer<typeof shiftSchema>;
export type UpdateShiftSchema = z.infer<typeof updateShiftSchema>;
export type PaymentSchema = z.infer<typeof paymentSchema>;
