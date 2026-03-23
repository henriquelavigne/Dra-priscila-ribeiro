import { apiClient } from "./client.js";
import { logger } from "../utils/logger.js";

type RemoteSettings = {
  botPhoneNumber: string;
  botName: string;
};

export async function fetchRemoteSettings(): Promise<RemoteSettings | null> {
  try {
    const data = await apiClient.get<RemoteSettings>("/settings");
    return data;
  } catch (err) {
    logger.warn({ err }, "[Settings] Não foi possível buscar configurações remotas");
    return null;
  }
}

export async function sendHeartbeat(): Promise<void> {
  try {
    await apiClient.put("/settings", {
      botLastSeen: new Date().toISOString(),
      botStatus: "online",
    });
  } catch {
    // Silencioso — falha de heartbeat não deve interromper o bot
  }
}
