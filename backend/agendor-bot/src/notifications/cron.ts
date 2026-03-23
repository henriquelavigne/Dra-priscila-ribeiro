import cron from "node-cron";
import { logger } from "../utils/logger.js";
import { config } from "../config/index.js";
import { sendWeeklyNotification } from "./weekly.js";
import { sendHeartbeat, fetchRemoteSettings } from "../api/settings.js";

const DAY_NAMES = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];

export function initCron(): void {
  const { day, hour, minute } = config.weeklyNotification;
  const expression = `${minute} ${hour} * * ${day}`;

  const dayName = DAY_NAMES[day] || `dia ${day}`;
  const timeStr = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;

  logger.info(`📅 Notificação semanal agendada para ${dayName} às ${timeStr}`);

  cron.schedule(expression, async () => {
    await sendWeeklyNotification();
  });

  // Heartbeat a cada 2 minutos — atualiza status do bot no painel
  cron.schedule("*/2 * * * *", async () => {
    await sendHeartbeat();
  });

  // Refresh do número configurado no painel a cada 5 minutos
  cron.schedule("*/5 * * * *", async () => {
    const remote = await fetchRemoteSettings();
    if (remote?.botPhoneNumber) {
      const jid = `${remote.botPhoneNumber.replace(/\D/g, "")}@s.whatsapp.net`;
      if (jid !== config.draPhoneNumber) {
        config.draPhoneNumber = jid;
        logger.info(`[Config] Número atualizado do painel: ${remote.botPhoneNumber}`);
      }
    }
  });

  logger.info("💓 Heartbeat agendado a cada 2 min | 🔄 Config refresh a cada 5 min");
}
