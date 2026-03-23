import { logger } from "../utils/logger.js";
import { createShift } from "../api/shifts.js";
import { fetchActiveWorkplaces } from "../api/workplaces.js";
import { formatCurrency } from "../utils/dates.js";
import type { AgentAction, ExecutionResult } from "../ai/agent.js";

export async function executeCreate(action: AgentAction): Promise<ExecutionResult> {
  if (!action.workplace_id) {
    return {
      success: false,
      message: "Local de trabalho não identificado",
      count: 0,
    };
  }

  // Resolve expectedValue: usa o fornecido ou busca o averageValue do workplace
  let expectedValue = action.expected_value;
  let usedDefaultValue = false;
  let defaultValueLabel = "";

  if (!expectedValue) {
    const workplaces = await fetchActiveWorkplaces();
    const wp = workplaces.find((w) => w.id === action.workplace_id);
    const avg = wp ? parseFloat(wp.averageValue.toString()) : NaN;
    if (!isNaN(avg) && avg > 0) {
      expectedValue = avg;
      usedDefaultValue = true;
      defaultValueLabel = formatCurrency(avg);
      logger.info(`[Executor] Usando valor médio do local: ${defaultValueLabel}`);
    } else {
      expectedValue = 0;
      logger.warn(`[Executor] averageValue não disponível para ${action.workplace_id}, usando 0`);
    }
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
      message: "Nenhuma data especificada para o agendamento",
      count: 0,
    };
  }

  const errors: string[] = [];
  const created: string[] = [];

  for (const date of dates) {
    try {
      await createShift({
        workplaceId: action.workplace_id,
        date,
        expectedValue,
        notes: action.description,
      });
      created.push(date);
      logger.info(`[Executor] Plantão criado: ${workplaceName} em ${date}`);
    } catch (err) {
      const msg = `Falha ao criar plantão em ${date}`;
      logger.error(err, `[Executor] ${msg}`);
      errors.push(msg);
    }
  }

  if (created.length === 0) {
    return {
      success: false,
      message: `Não foi possível criar nenhum plantão de ${workplaceName}`,
      count: 0,
      errors,
    };
  }

  const baseMessage = usedDefaultValue
    ? `${action.description} (valor padrão ${defaultValueLabel})`
    : action.description;

  return {
    success: true,
    message: baseMessage,
    count: created.length,
    dates: created,
    workplaceName,
    errors: errors.length > 0 ? errors : undefined,
  };
}
