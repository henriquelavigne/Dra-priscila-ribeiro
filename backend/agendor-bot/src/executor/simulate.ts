import { logger } from "../utils/logger.js";
import { config } from "../config/index.js";
import { formatCurrency } from "../utils/dates.js";
import type { AgentAction, AgentResponse } from "../ai/agent.js";
import { executeActions } from "./index.js";

const SIMULATION_TTL_MS = 5 * 60 * 1000; // 5 minutos

interface PendingSimulation {
  actions: AgentAction[];
  timestamp: number;
}

const pendingSimulations = new Map<string, PendingSimulation>();

const CONFIRMATIONS = new Set([
  "sim", "s", "confirmar", "pode", "aplica", "quero", "ok",
  "pode sim", "pode ser", "quero sim", "bora", "vai", "ta", "tá",
  "claro", "ótimo", "otimo", "perfeito", "isso", "exato", "confirma",
  "aplica sim", "pode aplicar", "faz", "faz sim",
]);
const DENIALS = new Set([
  "não", "nao", "n", "cancela", "deixa", "esquece",
  "não quero", "nao quero", "deixa pra lá", "deixa pra la",
  "para", "para não", "nao vai", "não vai", "desiste", "descarta",
]);

export function handleSimulation(response: AgentResponse): string {
  const sim = response.simulation!;

  // Salva as ações pendentes (são as ações reais que serão executadas se confirmado)
  pendingSimulations.set(config.draPhoneNumber, {
    actions: response.actions,
    timestamp: Date.now(),
  });

  logger.info(`[Simulate] Simulação salva para ${config.draPhoneNumber}, ${response.actions.length} ações pendentes`);

  // Monta preview a partir dos dados da simulação
  const diferenca = sim.difference >= 0
    ? `+${formatCurrency(sim.difference)}`
    : `-${formatCurrency(Math.abs(sim.difference))}`;

  const lines: string[] = [
    `📊 *${sim.description}*`,
    ``,
    `Renda atual prevista: ${formatCurrency(sim.current_revenue)}`,
    `Nova renda prevista: ${formatCurrency(sim.simulated_revenue)} (${diferenca})`,
    ``,
    sim.changes_summary,
    ``,
    `Deseja aplicar essas mudanças? Responda *sim* ou *não*.`,
  ];

  return lines.join("\n");
}

export async function checkPendingSimulation(text: string): Promise<string | null> {
  const pending = pendingSimulations.get(config.draPhoneNumber);
  if (!pending) return null;

  // Expirou?
  if (Date.now() - pending.timestamp > SIMULATION_TTL_MS) {
    pendingSimulations.delete(config.draPhoneNumber);
    logger.info("[Simulate] Simulação expirada, removida");
    return "⏰ A simulação expirou (5 min sem resposta). Para refazê-la, repita o comando.";
  }

  const normalized = text.toLowerCase().trim();

  if (CONFIRMATIONS.has(normalized)) {
    pendingSimulations.delete(config.draPhoneNumber);
    logger.info("[Simulate] Simulação confirmada, executando ações");

    // Reconstrói AgentResponse para reutilizar executeActions
    const fakeResponse: AgentResponse = {
      understood: true,
      actions: pending.actions,
      errors: [],
    };

    try {
      const result = await executeActions(fakeResponse);
      return `✓ Mudanças aplicadas!\n\n${result}`;
    } catch (err) {
      logger.error(err, "[Simulate] Erro ao executar ações confirmadas");
      return "⚠ Ocorreu um erro ao aplicar as mudanças. Tente o comando novamente.";
    }
  }

  if (DENIALS.has(normalized)) {
    pendingSimulations.delete(config.draPhoneNumber);
    logger.info("[Simulate] Simulação descartada pela Dra.");
    return "✓ Simulação descartada. Nenhuma alteração feita.";
  }

  // Qualquer outra coisa: remove e processa como novo comando
  pendingSimulations.delete(config.draPhoneNumber);
  logger.info("[Simulate] Texto não é confirmação/negação, simulação descartada e processando como novo comando");
  return null;
}
