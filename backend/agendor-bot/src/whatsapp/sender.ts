import type { WASocket } from "@whiskeysockets/baileys";
import { config } from "../config";

export async function sendMessage(sock: WASocket, text: string): Promise<void> {
  await sock.sendMessage(config.draPhoneNumber, { text });
}

export async function sendTyping(sock: WASocket): Promise<void> {
  await sock.presenceSubscribe(config.draPhoneNumber);
  await sock.sendPresenceUpdate("composing", config.draPhoneNumber);
}

export async function stopTyping(sock: WASocket): Promise<void> {
  await sock.sendPresenceUpdate("paused", config.draPhoneNumber);
}
