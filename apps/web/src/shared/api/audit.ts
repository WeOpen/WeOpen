import { apiFetch, ensureApiResponse } from "./base";

export type AuditEntry = {
  id: string;
  actorUserId: string;
  pluginId?: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

type AuditLogsResponse = {
  entries?: AuditEntry[] | null;
};

export async function listAuditLogs(): Promise<AuditEntry[]> {
  const response = await apiFetch("/api/audit-logs", {
    headers: { Accept: "application/json" }
  });
  await ensureApiResponse(response, "审计日志读取失败");
  const body = (await response.json()) as AuditLogsResponse;
  return Array.isArray(body.entries) ? body.entries.map(normalizeAuditEntry) : [];
}

function normalizeAuditEntry(entry: AuditEntry): AuditEntry {
  return {
    ...entry,
    metadata: isRecord(entry.metadata) ? entry.metadata : {}
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
