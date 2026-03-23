import { api } from "./client.js";
import { logger } from "../utils/logger.js";
import type { Shift, CreateShiftInput } from "./types.js";

export async function listShifts(params?: {
  month?: number;
  year?: number;
  workplaceId?: string;
  status?: string;
}): Promise<Shift[]> {
  const { data } = await api.get("/shifts", { params });
  return data;
}

export async function getShift(id: string): Promise<Shift> {
  const { data } = await api.get(`/shifts/${id}`);
  return data;
}

export async function getShiftsByDate(date: string): Promise<Shift[]> {
  const { data } = await api.get(`/shifts/by-date/${date}`);
  return data;
}

export async function createShift(input: CreateShiftInput): Promise<Shift> {
  const { data } = await api.post("/shifts", { ...input, source: "whatsapp" });
  return data;
}

export async function updateShift(
  id: string,
  input: Partial<CreateShiftInput>
): Promise<Shift> {
  const { data } = await api.put(`/shifts/${id}`, { ...input, source: "whatsapp" });
  return data;
}

export async function cancelShift(id: string): Promise<Shift> {
  const { data } = await api.patch(`/shifts/${id}`, { action: "cancel", source: "whatsapp" });
  return data;
}

export async function deleteShift(id: string): Promise<void> {
  await api.delete(`/shifts/${id}`);
}

export async function fetchShiftsByMonth(month: number, year: number): Promise<Shift[]> {
  try {
    return await listShifts({ month, year });
  } catch (err) {
    logger.error(err, `[API] Erro ao buscar plantões de ${month}/${year}`);
    return [];
  }
}

export async function fetchShiftsByDateRange(startDate: string, endDate: string): Promise<Shift[]> {
  try {
    const start = new Date(startDate + "T12:00:00");
    const end = new Date(endDate + "T12:00:00");
    const months = new Set<string>();

    const cursor = new Date(start);
    while (cursor <= end) {
      months.add(`${cursor.getFullYear()}-${cursor.getMonth() + 1}`);
      cursor.setMonth(cursor.getMonth() + 1);
    }
    // Ensure the end month is included
    months.add(`${end.getFullYear()}-${end.getMonth() + 1}`);

    const allShifts: Shift[] = [];
    for (const key of months) {
      const [y, m] = key.split("-").map(Number);
      const shifts = await listShifts({ month: m, year: y });
      allShifts.push(...shifts);
    }

    return allShifts.filter((s) => {
      const d = s.date.split("T")[0];
      return d >= startDate && d <= endDate;
    });
  } catch (err) {
    logger.error(err, `[API] Erro ao buscar plantões de ${startDate} a ${endDate}`);
    return [];
  }
}
