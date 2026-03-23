import makeWASocket, {
  useMultiFileAuthState,
  DisconnectReason,
  WASocket,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import qrcode from "qrcode-terminal";
import pino from "pino";
import * as fs from "fs";
import * as path from "path";

import { config } from "../config/index.js";
import { logger } from "../utils/logger.js";
import { handleMessage } from "./handler.js";
import { useSupabaseAuthState } from "./auth-store.js";

const AUTH_DIR = path.resolve("./auth_info");

let sock: WASocket | null = null;

export function getSocket(): WASocket {
  if (!sock) throw new Error("WhatsApp socket não inicializado");
  return sock;
}

async function getAuthState() {
  // Usa Supabase em produção (se configurado), disco local em dev
  const hasSupabase = !!config.supabaseUrl && !!config.supabaseServiceKey
    && !config.supabaseUrl.includes("xxx.supabase.co");

  if (hasSupabase) {
    logger.info("[Auth] Usando Supabase para persistência de sessão");
    return useSupabaseAuthState();
  }

  logger.info("[Auth] Usando armazenamento local (auth_info/)");
  return useMultiFileAuthState(AUTH_DIR);
}

export async function initWhatsApp(): Promise<void> {
  const { state, saveCreds } = await getAuthState();
  const { version } = await fetchLatestBaileysVersion();

  const baileysLogger = pino({ level: "silent" });

  logger.info(`[WhatsApp] Usando versão WA: ${version.join(".")}`);

  sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, baileysLogger),
    },
    logger: baileysLogger,
    version,
  });

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      logger.info("[WhatsApp] Escaneie o QR Code abaixo:");
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      logger.info("✓ WhatsApp conectado com sucesso");
    }

    if (connection === "close") {
      const error = lastDisconnect?.error as Boom | undefined;
      const statusCode = error?.output?.statusCode;

      if (statusCode === DisconnectReason.loggedOut) {
        logger.error("Sessão encerrada. Escaneie o QR code novamente.");
        // Remove auth local se existir
        if (fs.existsSync(AUTH_DIR)) {
          fs.rmSync(AUTH_DIR, { recursive: true, force: true });
        }
        initWhatsApp();
      } else {
        logger.warn(
          `[WhatsApp] Conexão fechada (código: ${statusCode}). Reconectando em 5s...`
        );
        setTimeout(() => initWhatsApp(), 5000);
      }
    }
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages) {
      await handleMessage(msg, sock!);
    }
  });
}
