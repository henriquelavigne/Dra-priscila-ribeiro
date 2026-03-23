import type { AgentResponse } from "../ai/agent.js";

export function executeQuery(response: AgentResponse): string {
  if (response.query_response) {
    return `📋 ${response.query_response}`;
  }
  return "Não consegui processar sua consulta. Pode reformular?";
}
