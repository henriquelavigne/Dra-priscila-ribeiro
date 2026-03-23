import { api } from "./client.js";
import { logger } from "../utils/logger.js";
import type { Workplace } from "./types.js";

export async function listWorkplaces(activeOnly = true): Promise<Workplace[]> {
  const { data } = await api.get("/workplaces", {
    params: activeOnly ? { activeOnly: "true" } : undefined,
  });
  return data;
}

export async function getWorkplace(id: string): Promise<Workplace> {
  const { data } = await api.get(`/workplaces/${id}`);
  return data;
}

export async function createWorkplace(input: {
  name: string;
  color: string;
  averageValue: number;
  paymentDeadlineDays: number;
  notes?: string;
}): Promise<Workplace> {
  const { data } = await api.post("/workplaces", input);
  return data;
}

export async function fetchActiveWorkplaces(): Promise<Workplace[]> {
  try {
    return await listWorkplaces(true);
  } catch (err) {
    logger.error(err, "[API] Erro ao buscar locais de trabalho ativos");
    return [];
  }
}
