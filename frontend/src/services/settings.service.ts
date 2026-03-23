import { prisma } from "@/lib/prisma";

export type SystemSettings = {
  botPhoneNumber: string;
  botName: string;
  botLastSeen: string;  // ISO timestamp, vazio se nunca conectou
  botStatus: string;    // "online" | "" (vazio = desconhecido)
};

const DEFAULTS: SystemSettings = {
  botPhoneNumber: "",
  botName: "Agendor",
  botLastSeen: "",
  botStatus: "",
};

export async function getSettings(): Promise<SystemSettings> {
  const rows = await prisma.systemConfig.findMany();
  const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  return {
    botPhoneNumber: map["botPhoneNumber"] ?? DEFAULTS.botPhoneNumber,
    botName: map["botName"] ?? DEFAULTS.botName,
    botLastSeen: map["botLastSeen"] ?? DEFAULTS.botLastSeen,
    botStatus: map["botStatus"] ?? DEFAULTS.botStatus,
  };
}

export async function updateSettings(
  input: Partial<SystemSettings>
): Promise<SystemSettings> {
  const updates = Object.entries(input).filter(([, v]) => v !== undefined) as [
    string,
    string
  ][];

  await Promise.all(
    updates.map(([key, value]) =>
      prisma.systemConfig.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    )
  );

  return getSettings();
}
