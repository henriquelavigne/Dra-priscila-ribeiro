import { prisma } from "@/lib/prisma";

interface LogChangeParams {
  entityType: string;
  entityId: string;
  action: "create" | "update" | "delete";
  changes: object;
  source?: string;
}

export async function logChange({
  entityType,
  entityId,
  action,
  changes,
  source = "web",
}: LogChangeParams): Promise<void> {
  await prisma.auditLog.create({
    data: {
      entityType,
      entityId,
      action,
      changes,
      source,
    },
  });
}
