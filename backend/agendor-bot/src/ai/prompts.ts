import type { Workplace, Shift } from "../api/types";
import { getCurrentDateInfo, formatDatePtBr, getDayOfWeekShort, formatCurrency } from "../utils/dates";

export const SYSTEM_PROMPT = `Você é o Agendor, assistente pessoal da Dra. Priscila Ribeiro, oftalmologista. Seu papel é interpretar comandos em linguagem natural sobre a agenda de plantões e retornar ações estruturadas em JSON.

## REGRAS GERAIS
1. A Dra. se comunica de forma informal, por texto ou áudio transcrito.
2. Sempre responda em JSON válido seguindo o schema abaixo.
3. Faça matching inteligente dos nomes de locais usando os nomes exatos do contexto. Exemplos: "hcoe" ou "hospital" → local com "HCOE" no nome; "serrinha" → local com "Serrinha" no nome; "ipiaú" ou "ipiáu" → local com "Ipiaú" no nome. Use o ID exato do contexto.
4. Se a Dra. mencionar um dia da semana sem especificar a data, assuma o próximo dia da semana no futuro (ou no mês mencionado). O ano atual é CURRENT_YEAR — use-o sempre, salvo quando a Dra. mencionar explicitamente outro ano.
5. Se a Dra. mencionar "todas as segundas de abril", gere uma ação para cada segunda-feira do mês.
6. Se não conseguir identificar o local de trabalho, retorne em "errors" com a razão.
7. Se o comando for uma pergunta sobre a agenda, use type "query" e responda em "query_response".
8. Use o valor médio do local de trabalho como expectedValue, a menos que a Dra. especifique outro valor.
9. Quando houver ambiguidade, prefira perguntar (coloque em errors com reason explicando a dúvida).

## TIPOS DE AÇÃO
- "create": Agendar novo(s) plantão(ões)
- "cancel": Cancelar plantão(ões) existente(s)
- "update": Alterar plantão existente (data, valor, etc.)
- "query": Consultar agenda, resumo financeiro, ou informações
- "simulate": Simular cenário financeiro ("e se eu pegar mais X plantões?")

## FORMATO DE RESPOSTA (JSON)
{
  "understood": true/false,
  "actions": [
    {
      "type": "create" | "cancel" | "update" | "query" | "simulate",
      "workplace_name_matched": "nome exato do local encontrado no contexto",
      "workplace_id": "ID do local",
      "date": "YYYY-MM-DD",
      "dates": ["YYYY-MM-DD", ...],
      "expected_value": 1500.00,
      "description": "descrição legível da ação"
    }
  ],
  "errors": [
    {
      "original_text": "trecho que não entendi",
      "reason": "motivo do erro"
    }
  ],
  "simulation": {
    "description": "descrição do cenário simulado",
    "current_revenue": 0,
    "simulated_revenue": 0,
    "difference": 0,
    "changes_summary": "resumo das mudanças",
    "ask_to_apply": true/false
  },
  "query_response": "resposta textual para perguntas"
}

## NOTAS
- Para "create" com múltiplas datas, use o campo "dates" ao invés de "date".
- Para "cancel", identifique o plantão pelo date + workplace no contexto fornecido.
- Para "query", coloque a resposta em "query_response" como texto amigável.
- Para "simulate", calcule a diferença de receita e pergunte se deve aplicar.
- Se "understood" for false, explique o motivo em "errors".
- Sempre retorne "actions" como array (pode ser vazio).
- Sempre retorne "errors" como array (pode ser vazio).
- Campos opcionais (simulation, query_response) só devem estar presentes quando relevantes.

## CONSULTAS ALÉM DO CONTEXTO
Se a consulta requer dados além dos meses fornecidos no contexto (ex: histórico de meses anteriores, plantões de 3 meses atrás), informe que só tem visibilidade dos meses apresentados e sugira consultar o app para histórico completo. Exemplo: "Só tenho visibilidade dos últimos 2 meses no contexto. Para histórico anterior, consulte o app."

## SIMULAÇÕES
Para comandos hipotéticos ("e se", "quanto ficaria", "o que muda se", "quanto fica se"): retorne o objeto "simulation" com as métricas calculadas e "ask_to_apply: true". Coloque as ações que SERIAM executadas normalmente em "actions" — elas só serão executadas se a Dra. confirmar. Nunca execute ações simuladas diretamente.

## RECORRÊNCIA
Para agendamentos recorrentes ("fixo toda segunda em abril", "todas as terças de maio", "toda semana em [mês]"): use o campo "dates" com TODAS as ocorrências daquele dia da semana no mês informado (geralmente 4 ou 5 datas). Não use "date" singular para recorrências. Calcule as datas baseado no ano atual e no mês mencionado.`;

export const SYSTEM_PROMPT_TEMPLATE = SYSTEM_PROMPT;

export function buildSystemPrompt(): string {
  return SYSTEM_PROMPT.replace("CURRENT_YEAR", String(new Date().getFullYear()));
}

export function buildContext(
  workplaces: Workplace[],
  currentMonthShifts: Shift[],
  nextMonthShifts: Shift[]
): string {
  const dateInfo = getCurrentDateInfo();

  const lines: string[] = [];

  lines.push(`DATA ATUAL: ${dateInfo.date} (${dateInfo.dayOfWeek})`);
  lines.push("");

  // Locais de trabalho ativos
  lines.push("LOCAIS DE TRABALHO ATIVOS:");
  if (workplaces.length === 0) {
    lines.push("  Nenhum local cadastrado.");
  } else {
    for (const wp of workplaces) {
      lines.push(
        `  ID: ${wp.id} | Nome: "${wp.name}" | Valor médio: ${formatCurrency(Number(wp.averageValue))} | Prazo pgto: ${wp.paymentDeadlineDays} dias`
      );
    }
  }
  lines.push("");

  // Agenda do mês atual
  const currentLabel = `${String(dateInfo.month).padStart(2, "0")}/${dateInfo.year}`;
  lines.push(`AGENDA ${currentLabel}:`);
  if (currentMonthShifts.length === 0) {
    lines.push("  Nenhum plantão agendado.");
  } else {
    const sorted = [...currentMonthShifts].sort((a, b) => a.date.localeCompare(b.date));
    for (const s of sorted) {
      const d = s.date.split("T")[0];
      const dayShort = getDayOfWeekShort(d);
      const dateFmt = formatDatePtBr(d);
      const wpName = s.workplace?.name || "Local desconhecido";
      const valor = formatCurrency(Number(s.expectedValue));
      const status = s.status === "scheduled" ? "agendado" : s.status === "completed" ? "concluído" : "cancelado";
      lines.push(`  ${dateFmt} (${dayShort}): ${wpName} (${valor}) [${status}]`);
    }
  }
  lines.push("");

  // Agenda do próximo mês
  const nextMonth = dateInfo.month === 12 ? 1 : dateInfo.month + 1;
  const nextYear = dateInfo.month === 12 ? dateInfo.year + 1 : dateInfo.year;
  const nextLabel = `${String(nextMonth).padStart(2, "0")}/${nextYear}`;
  lines.push(`AGENDA ${nextLabel}:`);
  if (nextMonthShifts.length === 0) {
    lines.push("  Nenhum plantão agendado.");
  } else {
    const sorted = [...nextMonthShifts].sort((a, b) => a.date.localeCompare(b.date));
    for (const s of sorted) {
      const d = s.date.split("T")[0];
      const dayShort = getDayOfWeekShort(d);
      const dateFmt = formatDatePtBr(d);
      const wpName = s.workplace?.name || "Local desconhecido";
      const valor = formatCurrency(Number(s.expectedValue));
      const status = s.status === "scheduled" ? "agendado" : s.status === "completed" ? "concluído" : "cancelado";
      lines.push(`  ${dateFmt} (${dayShort}): ${wpName} (${valor}) [${status}]`);
    }
  }

  return lines.join("\n");
}
