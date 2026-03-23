import dotenv from "dotenv";
dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável ${name} não configurada no .env`);
  }
  return value;
}

function formatWhatsAppJid(phone: string): string {
  const clean = phone.replace(/\D/g, "");
  return clean.includes("@") ? clean : `${clean}@s.whatsapp.net`;
}

export const config = {
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  apiBaseUrl: requireEnv("API_BASE_URL"),
  // draPhoneNumber pode vir do env ou das configurações remotas (painel)
  draPhoneNumber: process.env.DRA_PHONE_NUMBER
    ? formatWhatsAppJid(process.env.DRA_PHONE_NUMBER)
    : "",
  botName: process.env.BOT_NAME || "Agendor",
  weeklyNotification: {
    day: parseInt(process.env.WEEKLY_NOTIFICATION_DAY || "1", 10),
    hour: parseInt(process.env.WEEKLY_NOTIFICATION_HOUR || "8", 10),
    minute: parseInt(process.env.WEEKLY_NOTIFICATION_MINUTE || "0", 10),
  },
  nodeEnv: process.env.NODE_ENV || "development",
  supabaseUrl: process.env.SUPABASE_URL || "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY || "",
};

export type Config = typeof config;
