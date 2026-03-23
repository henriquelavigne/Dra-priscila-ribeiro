import { api } from "./client.js";
import { logger } from "../utils/logger.js";
import type { Payment, CreatePaymentInput, FinanceSummary, DashboardResponse, AutoNote } from "./types.js";

export async function listPayments(params?: {
  status?: string;
  month?: number;
  year?: number;
  workplaceId?: string;
}): Promise<Payment[]> {
  const { data } = await api.get("/payments", { params });
  return data;
}

export async function getPaymentSummary(month?: number, year?: number): Promise<FinanceSummary> {
  const { data } = await api.get("/payments/summary", { params: { month, year } });
  return data;
}

export async function registerPayment(input: CreatePaymentInput): Promise<Payment> {
  const { data } = await api.post("/payments", input);
  return data;
}

export async function getDashboard(): Promise<DashboardResponse> {
  const { data } = await api.get("/dashboard");
  return data;
}

export async function fetchFinanceSummary(month?: number, year?: number): Promise<FinanceSummary | null> {
  try {
    return await getPaymentSummary(month, year);
  } catch (err) {
    logger.error(err, "[API] Erro ao buscar resumo financeiro");
    return null;
  }
}

export async function fetchAutoNotes(): Promise<AutoNote[]> {
  try {
    const { data } = await api.get("/auto-notes");
    return data;
  } catch (err) {
    logger.error(err, "[API] Erro ao buscar auto-notes");
    return [];
  }
}

export async function triggerAutoNotesCheck(): Promise<void> {
  try {
    await api.post("/auto-notes/check");
  } catch (err) {
    logger.error(err, "[API] Erro ao disparar verificação de auto-notes");
  }
}
