import { logger } from "../utils/logger.js";
import type { AgentResponse, ExecutionResult } from "../ai/agent.js";
import { executeCreate } from "./create.js";
import { executeCancel } from "./cancel.js";
import { formatSuccessMessage, formatErrorMessage, formatPartialMessage } from "../utils/formatter.js";

export async function executeActions(response: AgentResponse): Promise<string> {
  // Não entendeu o comando
  if (!response.understood || response.actions.length === 0) {
    if (response.errors.length > 0) {
      return formatErrorMessage(response.errors);
    }
    return "⚠ Não entendi o comando. Pode repetir de outra forma?";
  }

  // Executa ações
  const successes: ExecutionResult[] = [];
  const agentErrors = [...response.errors];

  for (const action of response.actions) {
    logger.info(`[Executor] Executando ação: ${action.type} — ${action.description}`);

    try {
      let result: ExecutionResult;

      if (action.type === "create") {
        result = await executeCreate(action);
      } else if (action.type === "cancel") {
        result = await executeCancel(action);
      } else if (action.type === "update") {
        // Substituição: cancela o shift existente e cria o novo
        const cancelResult = await executeCancel({
          ...action,
          workplace_id: action.workplace_id,
          workplace_name_matched: action.workplace_name_matched,
        });
        if (!cancelResult.success) {
          agentErrors.push({
            original_text: action.description,
            reason: `Não foi possível substituir: ${cancelResult.message}`,
          });
          continue; // Aborta o create — evita plantão órfão
        }
        const createResult = await executeCreate(action);
        if (createResult.success) {
          createResult.message = `${action.workplace_name_matched || ""} cancelado e reagendado — ${action.description}`;
          successes.push(createResult);
        } else {
          agentErrors.push({
            original_text: action.description,
            reason: createResult.message,
          });
        }
        continue;
      } else if (action.type === "query") {
        // query_response já foi tratado acima; ação individual ignorada
        continue;
      } else {
        // simulate ou outros tipos não executáveis aqui
        continue;
      }

      if (result.success) {
        successes.push(result);
        if (result.errors && result.errors.length > 0) {
          result.errors.forEach((e) =>
            agentErrors.push({ original_text: action.description, reason: e })
          );
        }
      } else {
        agentErrors.push({
          original_text: action.description,
          reason: result.message,
        });
      }
    } catch (err) {
      logger.error(err, `[Executor] Erro inesperado ao executar ação: ${action.type}`);
      agentErrors.push({
        original_text: action.description,
        reason: "Erro interno ao executar ação",
      });
    }
  }

  // Monta resposta final
  if (successes.length > 0 && agentErrors.length > 0) {
    return formatPartialMessage(successes, agentErrors);
  }
  if (successes.length > 0) {
    return formatSuccessMessage(successes);
  }
  if (agentErrors.length > 0) {
    return formatErrorMessage(agentErrors);
  }

  return "⚠ Nenhuma ação foi executada.";
}
