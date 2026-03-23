import { config } from "./config/index.js";
import { logger } from "./utils/logger.js";
import { initWhatsApp } from "./whatsapp/client.js";
import { initCron } from "./notifications/cron.js";
import { fetchRemoteSettings } from "./api/settings.js";

function formatJid(phone: string): string {
  const clean = phone.replace(/\D/g, "");
  return clean.includes("@") ? clean : `${clean}@s.whatsapp.net`;
}

async function applyRemoteSettings(): Promise<void> {
  const remote = await fetchRemoteSettings();
  if (!remote) return;

  if (remote.botPhoneNumber && !config.draPhoneNumber) {
    config.draPhoneNumber = formatJid(remote.botPhoneNumber);
    logger.info(`[Settings] Número do bot carregado do painel: ${config.draPhoneNumber}`);
  }

  if (remote.botName && remote.botName !== config.botName) {
    config.botName = remote.botName;
    logger.info(`[Settings] Nome do bot: ${config.botName}`);
  }
}

async function main(): Promise<void> {
  logger.info(`🤖 Bot iniciando...`);
  logger.info(`API: ${config.apiBaseUrl}`);
  logger.info(`Ambiente: ${config.nodeEnv}`);

  await applyRemoteSettings();

  if (!config.draPhoneNumber) {
    logger.warn(
      "[Config] DRA_PHONE_NUMBER não configurado. Configure pelo painel em /settings ou pela variável de ambiente."
    );
  } else {
    logger.info(`[Config] Número monitorado: ${config.draPhoneNumber}`);
  }

  await initWhatsApp();
  initCron();

  logger.info(`✓ ${config.botName} Bot inicializado — aguardando conexão WhatsApp...`);
}

main().catch((err) => {
  logger.fatal(err, "Erro fatal durante inicialização");
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  logger.fatal(err, "Uncaught exception");
});

process.on("unhandledRejection", (err) => {
  logger.fatal(err as Error, "Unhandled rejection");
});
