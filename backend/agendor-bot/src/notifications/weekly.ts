import { logger } from "../utils/logger";
import { triggerAutoNotesCheck, fetchAutoNotes } from "../api/finances";
import { formatCurrency } from "../utils/dates";
import { getSocket } from "../whatsapp/client";
import { sendMessage } from "../whatsapp/sender";
import { config } from "../config";
import type { AutoNote } from "../api/types";

interface WorkplaceGroup {
  workplaceId: string;
  workplaceName: string;
  notes: AutoNote[];
  totalPending: number;
  hasOverdue: boolean;
  oldestDueDate: string;
}

function getDaysOverdue(dueDate: string): number {
  const due = new Date(dueDate + "T12:00:00");
  const now = new Date();
  const diffMs = now.getTime() - due.getTime();
  return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
}

function groupAutoNotesByWorkplace(notes: AutoNote[]): WorkplaceGroup[] {
  const map = new Map<string, WorkplaceGroup>();

  for (const note of notes) {
    const existing = map.get(note.workplaceId);
    if (existing) {
      existing.notes.push(note);
      existing.totalPending += parseFloat(note.amountPending.toString()) || 0;
      if (note.type === "payment_overdue") existing.hasOverdue = true;
      if (note.dueDate < existing.oldestDueDate) existing.oldestDueDate = note.dueDate;
    } else {
      map.set(note.workplaceId, {
        workplaceId: note.workplaceId,
        workplaceName: note.workplace?.name || `Local ${note.workplaceId.slice(0, 6)}`,
        notes: [note],
        totalPending: parseFloat(note.amountPending.toString()) || 0,
        hasOverdue: note.type === "payment_overdue",
        oldestDueDate: note.dueDate,
      });
    }
  }

  // Ordena por valor pendente decrescente
  return Array.from(map.values()).sort((a, b) => b.totalPending - a.totalPending);
}

export async function sendWeeklyNotification(): Promise<void> {
  logger.info("[Notificação] Executando verificação semanal...");

  try {
    let sock;
    try {
      sock = getSocket();
    } catch {
      logger.warn("[Notificação] WhatsApp ainda não conectado — notificação adiada");
      return;
    }

    // Atualiza auto-notes
    await triggerAutoNotesCheck();

    // Busca auto-notes ativas
    const autoNotes = await fetchAutoNotes();
    const activeNotes = autoNotes.filter((n) => n.status === "active");

    let message: string;

    if (activeNotes.length === 0) {
      message = "✅ Bom dia, Dra. Priscila! Todos os pagamentos estão em dia. Boa semana!";
    } else {
      const groups = groupAutoNotesByWorkplace(activeNotes);
      const totalPending = groups.reduce((sum, g) => sum + g.totalPending, 0);

      const lines: string[] = [
        "🔔 Bom dia, Dra. Priscila! Resumo de pendências:",
        "",
      ];

      for (const group of groups) {
        const emoji = group.hasOverdue ? "🔴" : "🟡";
        const count = group.notes.length;
        const valor = formatCurrency(group.totalPending);

        if (group.hasOverdue) {
          const daysOverdue = getDaysOverdue(group.oldestDueDate);
          lines.push(
            `${emoji} *${group.workplaceName}* — ${valor} pendente (${count} plantão${count !== 1 ? "ões" : ""}, ${daysOverdue} dia${daysOverdue !== 1 ? "s" : ""} de atraso)`
          );
        } else {
          lines.push(
            `${emoji} *${group.workplaceName}* — ${valor} pendente (${count} plantão${count !== 1 ? "ões" : ""}, pagamento parcial)`
          );
        }
      }

      lines.push("");
      lines.push(`Total pendente: ${formatCurrency(totalPending)}`);
      lines.push("");
      lines.push("Marque os recebimentos pelo app quando receber ✓");

      message = lines.join("\n");
    }

    await sendMessage(sock, message);
    logger.info("[Notificação] Enviada com sucesso");
  } catch (err) {
    logger.error(err, "[Notificação] Erro ao enviar notificação semanal");
  }
}
