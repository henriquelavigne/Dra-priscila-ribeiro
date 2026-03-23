import { formatDateBR, formatCurrency, formatDatePtBr, getDayOfWeekShort } from "./dates";
import type { Shift, Workplace, DashboardResponse, FinanceSummary } from "../api/types";
import type { ExecutionResult } from "../ai/agent";
import type { AgentError } from "../ai/agent";

// ─── Shift list (agenda) ──────────────────────────────────────────────────────

export function formatShiftList(shifts: (Shift & { workplace?: Workplace })[]): string {
  if (shifts.length === 0) return "Nenhum plantão encontrado.";

  return shifts
    .map((s) => {
      const date = formatDateBR(s.date);
      const local = s.workplace?.name || "Local desconhecido";
      const valor = formatCurrency(Number(s.expectedValue));
      const status = s.status === "scheduled" ? "📅" : s.status === "completed" ? "✅" : "❌";
      return `${status} ${date} — *${local}* — ${valor}`;
    })
    .join("\n");
}

export function formatDashboardSummary(data: DashboardResponse): string {
  const lines = [
    `📊 *Resumo do Mês*`,
    `Plantões agendados: ${data.currentMonthShiftCount}`,
    `Receita prevista: ${formatCurrency(data.currentMonthRevenue)}`,
    `Receita confirmada: ${formatCurrency(data.currentMonthConfirmedRevenue)}`,
    `Recebido: ${formatCurrency(data.currentMonthReceived)}`,
    `Pendente: ${formatCurrency(data.totalPending)}`,
  ];
  return lines.join("\n");
}

export function formatFinanceSummary(summary: FinanceSummary): string {
  const lines = [
    `💰 *Resumo Financeiro*`,
    `Total esperado: ${formatCurrency(summary.totalExpected)}`,
    `Total recebido: ${formatCurrency(summary.totalReceived)}`,
    `Total pendente: ${formatCurrency(summary.totalPending)}`,
    `Atrasados: ${summary.overdueCount}`,
    `Parciais: ${summary.partialCount}`,
  ];
  return lines.join("\n");
}

// ─── Execution results ────────────────────────────────────────────────────────

function formatSingleResult(r: ExecutionResult): string {
  const name = r.workplaceName || "Local";
  const dates = r.dates || [];

  if (dates.length === 1) {
    const d = dates[0];
    const dayShort = getDayOfWeekShort(d);
    const dateFmt = formatDatePtBr(d);
    return `✓ *${name}* agendado para ${dayShort} ${dateFmt}`;
  }

  if (dates.length > 1) {
    const dateList = dates
      .map((d) => `${getDayOfWeekShort(d)} ${formatDatePtBr(d)}`)
      .join(", ");
    return `✓ *${name}* agendado em ${dates.length} datas:\n  ${dateList}`;
  }

  return `✓ ${r.message}`;
}

function formatSingleCancel(r: ExecutionResult): string {
  const name = r.workplaceName || "Local";
  const dates = r.dates || [];

  if (dates.length === 1) {
    const d = dates[0];
    return `✓ *${name}* cancelado em ${formatDatePtBr(d)}`;
  }

  if (dates.length > 1) {
    const dateList = dates.map((d) => formatDatePtBr(d)).join(", ");
    return `✓ *${name}* cancelado nos dias ${dateList}`;
  }

  return `✓ ${r.message}`;
}

export function formatSuccessMessage(results: ExecutionResult[]): string {
  if (results.length === 0) return "";

  if (results.length === 1) {
    const r = results[0];
    // Substituição detectada pela mensagem
    if (r.message.toLowerCase().includes("cancelado e reagendado")) {
      return `✓ ${r.message}`;
    }
    return formatSingleResult(r);
  }

  // Múltiplas ações
  const lines: string[] = [];
  let totalCreated = 0;

  for (const r of results) {
    const dates = r.dates || [];
    totalCreated += dates.length || 1;
    const name = r.workplaceName || "Local";

    if (dates.length === 1) {
      const d = dates[0];
      lines.push(`  • *${name}* — ${getDayOfWeekShort(d)} ${formatDatePtBr(d)}`);
    } else if (dates.length > 1) {
      const dateList = dates.map((d) => formatDatePtBr(d)).join(", ");
      lines.push(`  • *${name}* — ${dateList}`);
    } else {
      lines.push(`  • ${r.message}`);
    }
  }

  return `✓ ${totalCreated} plantão${totalCreated !== 1 ? "ões" : ""} agendado${totalCreated !== 1 ? "s" : ""}:\n${lines.join("\n")}`;
}

export function formatErrorMessage(errors: AgentError[]): string {
  if (errors.length === 0) return "⚠ Ocorreu um erro inesperado.";

  if (errors.length === 1) {
    return `⚠ ${errors[0].reason}`;
  }

  const lines = errors.map((e) => `  • ${e.reason}`);
  return `⚠ Encontrei alguns problemas:\n${lines.join("\n")}`;
}

export function formatPartialMessage(
  successes: ExecutionResult[],
  errors: AgentError[]
): string {
  const successPart = formatSuccessMessage(successes);
  const errorPart = formatErrorMessage(errors);
  return `${successPart}\n\n${errorPart}`;
}
