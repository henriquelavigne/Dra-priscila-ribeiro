import cron from "node-cron";
import { logger } from "../utils/logger";
import { config } from "../config";
import { sendWeeklyNotification } from "./weekly";
import { sendHeartbeat } from "../api/settings";

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

  logger.info("💓 Heartbeat agendado a cada 2 min");
}
