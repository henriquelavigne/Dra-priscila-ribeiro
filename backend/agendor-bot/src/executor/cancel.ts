import { logger } from "../utils/logger";
import { fetchShiftsByDateRange, cancelShift } from "../api/shifts";
import type { AgentAction, ExecutionResult } from "../ai/agent";

async function cancelForDate(
  date: string,
  workplaceId: string,
  workplaceName: string
): Promise<{ cancelled: string[]; errors: string[] }> {
  const cancelled: string[] = [];
  const errors: string[] = [];

  const shifts = await fetchShiftsByDateRange(date, date);
  const targets = shifts.filter(
    (s) => s.workplaceId === workplaceId && s.status === "scheduled"
  );

  if (targets.length === 0) {
    // Verificar se existe mas com status diferente
    const existing = shifts.find((s) => s.workplaceId === workplaceId);
    if (existing?.status === "cancelled") {
      errors.push(`Plantão de ${workplaceName} em ${date} já estava cancelado`);
    } else if (existing?.status === "completed") {
      errors.push(`Plantão de ${workplaceName} em ${date} já foi concluído e não pode ser cancelado`);
    } else {
      errors.push(`Não encontrei plantão de ${workplaceName} em ${date} para cancelar`);
    }
    return { cancelled, errors };
  }

  for (const shift of targets) {
    try {
      await cancelShift(shift.id);
      cancelled.push(date);
      logger.info(`[Executor] Plantão cancelado: ${workplaceName} em ${date} (id: ${shift.id})`);
    } catch (err) {
      const msg = `Falha ao cancelar plantão de ${workplaceName} em ${date}`;
      logger.error(err, `[Executor] ${msg}`);
      errors.push(msg);
    }
  }

  return { cancelled, errors };
}

export async function executeCancel(action: AgentAction): Promise<ExecutionResult> {
  if (!action.workplace_id) {
    return {
      success: false,
      message: "Local de trabalho não identificado",
      count: 0,
    };
  }

  const workplaceName = action.workplace_name_matched || action.workplace_id;
  const dates = action.dates && action.dates.length > 0
    ? action.dates
    : action.date
    ? [action.date]
    : [];

  if (dates.length === 0) {
    return {
      success: false,
      message: "Nenhuma data especificada para o cancelamento",
      count: 0,
    };
  }

  const allCancelled: string[] = [];
  const allErrors: string[] = [];

  for (const date of dates) {
    const { cancelled, errors } = await cancelForDate(date, action.workplace_id, workplaceName);
    allCancelled.push(...cancelled);
    allErrors.push(...errors);
  }

  if (allCancelled.length === 0) {
    return {
      success: false,
      message: allErrors.join("; "),
      count: 0,
      errors: allErrors,
    };
  }

  return {
    success: true,
    message: action.description,
    count: allCancelled.length,
    dates: allCancelled,
    workplaceName,
    errors: allErrors.length > 0 ? allErrors : undefined,
  };
}
