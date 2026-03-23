import type { WAMessage, WASocket } from "@whiskeysockets/baileys";
import { downloadMediaMessage } from "@whiskeysockets/baileys";
import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";
import { sendMessage, sendTyping, stopTyping } from "./sender.js";
import { transcribeAudio } from "../ai/transcriber.js";
import { processCommand } from "../ai/agent.js";
import { executeActions } from "../executor/index.js";
import { executeQuery } from "../executor/query.js";
import { handleSimulation, checkPendingSimulation } from "../executor/simulate.js";

// ─── Rate limiting ─────────────────────────────────────────────────────────────
const RATE_WINDOW_MS = 10_000;
const RATE_MAX_MESSAGES = 5;
const messageTimestamps: number[] = [];

function isRateLimited(): boolean {
  const now = Date.now();
  // Remove timestamps fora da janela
  while (messageTimestamps.length > 0 && messageTimestamps[0] < now - RATE_WINDOW_MS) {
    messageTimestamps.shift();
  }
  messageTimestamps.push(now);
  return messageTimestamps.length > RATE_MAX_MESSAGES;
}

// ─── Processamento em andamento (debounce) ─────────────────────────────────────
let isProcessing = false;
let pendingMessage: { msg: WAMessage; sock: WASocket } | null = null;

// ─── Classificação de erros ────────────────────────────────────────────────────
function classifyError(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg === "timeout:processcommand") {
      return "⚠ O processamento demorou muito. Tente novamente.";
    }
    if (msg.includes("openai") || msg.includes("api key") || msg.includes("rate limit")) {
      return "⚠ Estou com dificuldade de processar seu comando. Tente novamente em alguns instantes.";
    }
    if (msg.includes("econnrefused") || msg.includes("enotfound") || msg.includes("network") || msg.includes("503") || msg.includes("502")) {
      return "⚠ Estou com dificuldade de acessar o sistema. Tente novamente em alguns minutos.";
    }
  }
  return "⚠ Ocorreu um erro ao processar sua mensagem. Tente novamente.";
}

// ─── Handler principal ─────────────────────────────────────────────────────────
export async function handleMessage(msg: WAMessage, sock: WASocket): Promise<void> {
  // Guards básicos
  if (msg.key.fromMe) return;

  const jid = msg.key.remoteJid;
  if (!jid) return;

  if (jid.endsWith("@g.us")) return;

  if (jid !== config.draPhoneNumber) return;

  const message = msg.message;
  if (!message) return;

  // Rate limiting: se mensagens rápidas demais, guarda a última e aguarda
  if (isRateLimited()) {
    logger.warn("[Handler] Rate limit atingido, enfileirando última mensagem");
    pendingMessage = { msg, sock };
    return;
  }

  // Se já está processando, guarda a mensagem e aguarda
  if (isProcessing) {
    logger.info("[Handler] Processamento em andamento, enfileirando mensagem");
    pendingMessage = { msg, sock };
    return;
  }

  await processMessage(msg, sock);

  // Processa mensagem enfileirada se houver
  if (pendingMessage) {
    const queued = pendingMessage;
    pendingMessage = null;
    logger.info("[Handler] Processando mensagem enfileirada");
    await processMessage(queued.msg, queued.sock);
  }
}

async function processMessage(msg: WAMessage, sock: WASocket): Promise<void> {
  isProcessing = true;

  try {
    const message = msg.message!;

    // Extrai texto
    let text: string | null =
      message.conversation ||
      message.extendedTextMessage?.text ||
      null;

    const isAudio = !!message.audioMessage;

    if (!text && !isAudio) return;

    const timestamp = new Date().toISOString();

    // Transcreve áudio
    if (isAudio) {
      logger.info({ timestamp, type: "audio" }, "[Handler] Mensagem recebida: áudio");
      await sendTyping(sock);

      try {
        const audioBuffer = await downloadMediaMessage(msg, "buffer", {}) as Buffer;
        const transcribed = await transcribeAudio(audioBuffer);

        if (!transcribed) {
          await stopTyping(sock);
          await sendMessage(sock, "⚠ Não consegui entender o áudio. Pode repetir ou enviar por texto?");
          return;
        }

        logger.info({ timestamp, type: "audio", transcribed }, "[Handler] Áudio transcrito");
        text = transcribed;
        await stopTyping(sock);
      } catch (err) {
        logger.error({ err, timestamp }, "[Handler] Erro ao transcrever áudio");
        await stopTyping(sock);
        await sendMessage(sock, "⚠ Não consegui entender o áudio. Pode repetir ou enviar por texto?");
        return;
      }
    } else {
      logger.info({ timestamp, type: "text", text }, "[Handler] Mensagem recebida: texto");
    }

    if (!text) return;

    // Verifica simulação pendente ANTES de processar como novo comando
    try {
      const simReply = await checkPendingSimulation(text);
      if (simReply !== null) {
        await sendMessage(sock, simReply);
        return;
      }
    } catch (err) {
      logger.error(err, "[Handler] Erro ao verificar simulação pendente");
    }

    // Processa como novo comando
    await sendTyping(sock);

    // Debounce: avisa se demorar mais de 30s
    const slowTimer = setTimeout(async () => {
      try {
        await sendMessage(sock, "⏳ Processando, um momento...");
      } catch (_) { /* ignora */ }
    }, 30_000);

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout:processCommand")), 45_000)
      );
      const agentResponse = await Promise.race([processCommand(text), timeoutPromise]);
      clearTimeout(slowTimer);

      logger.info({ agentResponse: { understood: agentResponse.understood, actions: agentResponse.actions.length, hasSimulation: !!agentResponse.simulation, hasQuery: !!agentResponse.query_response } }, "[Handler] Resposta do agente");

      await stopTyping(sock);

      // Simulação → aguarda confirmação
      if (agentResponse.simulation) {
        const simMessage = handleSimulation(agentResponse);
        await sendMessage(sock, simMessage);
        return;
      }

      // Consulta → resposta direta do GPT
      if (agentResponse.query_response) {
        const queryMessage = executeQuery(agentResponse);
        await sendMessage(sock, queryMessage);
        return;
      }

      // Ações normais
      const resultMessage = await executeActions(agentResponse);
      logger.info({ resultMessage }, "[Handler] Resultado enviado");
      await sendMessage(sock, resultMessage);
    } catch (err) {
      clearTimeout(slowTimer);
      logger.error({ err }, "[Handler] Erro ao processar comando");
      await stopTyping(sock);
      await sendMessage(sock, classifyError(err));
    }
  } finally {
    isProcessing = false;
  }
}
