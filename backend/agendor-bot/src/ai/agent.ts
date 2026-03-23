import OpenAI from "openai";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";
import { getCurrentMonthYear, getNextMonth } from "../utils/dates.js";
import { fetchActiveWorkplaces } from "../api/workplaces.js";
import { fetchShiftsByMonth } from "../api/shifts.js";
import { buildSystemPrompt, buildContext } from "./prompts.js";

const openai = new OpenAI({ apiKey: config.openaiApiKey });

export interface AgentAction {
  type: "create" | "cancel" | "update" | "query" | "simulate";
  workplace_name_matched?: string;
  workplace_id?: string;
  date?: string;
  dates?: string[];
  expected_value?: number;
  description: string;
}

export interface AgentError {
  original_text: string;
  reason: string;
}

export interface AgentSimulation {
  description: string;
  current_revenue: number;
  simulated_revenue: number;
  difference: number;
  changes_summary: string;
  ask_to_apply: boolean;
}

export interface AgentResponse {
  understood: boolean;
  actions: AgentAction[];
  errors: AgentError[];
  simulation?: AgentSimulation;
  query_response?: string;
}

export interface ExecutionResult {
  success: boolean;
  message: string;
  count: number;
  dates?: string[];
  workplaceName?: string;
  errors?: string[];
}

function makeErrorResponse(command: string, reason: string): AgentResponse {
  return {
    understood: false,
    actions: [],
    errors: [{ original_text: command, reason }],
  };
}

export async function processCommand(command: string): Promise<AgentResponse> {
  try {
    const { month, year } = getCurrentMonthYear();
    const next = getNextMonth(month, year);

    // allSettled: se qualquer fetch falhar, usa array vazio como fallback
    const [wpResult, curResult, nextResult] = await Promise.allSettled([
      fetchActiveWorkplaces(),
      fetchShiftsByMonth(month, year),
      fetchShiftsByMonth(next.month, next.year),
    ]);
    const workplaces = wpResult.status === "fulfilled" ? wpResult.value : [];
    const currentShifts = curResult.status === "fulfilled" ? curResult.value : [];
    const nextShifts = nextResult.status === "fulfilled" ? nextResult.value : [];
    if (wpResult.status === "rejected") logger.warn(wpResult.reason, "[Agent] Falha ao buscar locais");
    if (curResult.status === "rejected") logger.warn(curResult.reason, "[Agent] Falha ao buscar plantões do mês atual");
    if (nextResult.status === "rejected") logger.warn(nextResult.reason, "[Agent] Falha ao buscar plantões do próximo mês");

    const context = buildContext(workplaces, currentShifts, nextShifts);

    logger.info(`[Agent] Contexto montado: ${workplaces.length} locais, ${currentShifts.length} plantões mês atual, ${nextShifts.length} próximo mês`);

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: `CONTEXTO:\n${context}\n\nCOMANDO DA DRA. PRISCILA:\n${command}` },
      ],
      temperature: 0.1,
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return makeErrorResponse(command, "GPT não retornou resposta");
    }

    let parsed: AgentResponse;
    try {
      parsed = JSON.parse(raw) as AgentResponse;
    } catch {
      logger.warn({ raw }, "[Agent] GPT retornou JSON inválido");
      return makeErrorResponse(command, "Resposta do GPT em formato inesperado");
    }

    // Validação básica
    if (typeof parsed.understood !== "boolean") parsed.understood = false;
    if (!Array.isArray(parsed.actions)) parsed.actions = [];
    if (!Array.isArray(parsed.errors)) parsed.errors = [];

    logger.info({ response: parsed }, "[Agent] Resposta processada");

    return parsed;
  } catch (err) {
    logger.error(err, "[Agent] Erro ao processar comando");
    return makeErrorResponse(command, "Erro interno ao processar comando");
  }
}
