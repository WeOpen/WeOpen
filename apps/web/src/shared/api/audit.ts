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
  entries: AuditEntry[];
};

export async function listAuditLogs(): Promise<AuditEntry[]> {
  const response = await apiFetch("/api/audit-logs", {
    headers: { Accept: "application/json" }
  });
  await ensureApiResponse(response, "审计日志读取失败");
  const body = (await response.json()) as AuditLogsResponse;
  return body.entries;
}
