"use client";

import { useEffect, useState } from "react";
import { listAuditLogs, type AuditEntry } from "@/shared/api/audit";
import { Card, DataTable, StatusChip } from "@weopen/ui";
import { formatTimestamp } from "@/shared/format";

export function AuditLogPanel() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    void listAuditLogs()
      .then((nextEntries) => {
        if (!isMounted) return;
        setEntries(nextEntries);
        setError("");
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "审计日志读取失败");
      });
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <Card className="settings-audit-log">
      <Card.Header>
        <Card.Title>Audit Log</Card.Title>
        <StatusChip tone={error ? "danger" : "success"}>{error ? "READ BLOCKED" : "LIVE"}</StatusChip>
      </Card.Header>
      <Card.Content>
        {error ? <p role="alert">{error}</p> : null}
        <DataTable
          aria-label="Audit log"
          className="settings-audit-table"
          columns={[
            {
              id: "createdAt",
              label: "Time (UTC)",
              render: (entry) => formatTimestamp(entry.createdAt)
            },
            {
              id: "actor",
              label: "Actor",
              render: (entry) => entry.actorUserId || "system"
            },
            {
              id: "action",
              label: "Action",
              render: (entry) => entry.action
            },
            {
              id: "resource",
              label: "Resource",
              render: (entry) => entry.targetType
            },
            {
              id: "details",
              label: "Details",
              render: (entry) => entry.targetId || metadataSummary(entry.metadata)
            }
          ]}
          emptyDescription="No audit entries have been recorded yet."
          emptyTitle="No audit entries yet"
          getRowId={(entry) => entry.id}
          minWidth={760}
          rows={entries}
        />
      </Card.Content>
    </Card>
  );
}

function metadataSummary(metadata: Record<string, unknown>): string {
  const keys = Object.keys(metadata);
  if (keys.length === 0) {
    return "—";
  }
  return keys.slice(0, 2).map((key) => `${key}:${String(metadata[key])}`).join(" · ");
}
