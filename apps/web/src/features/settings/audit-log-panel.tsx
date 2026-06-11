"use client";

import { useEffect, useState } from "react";
import { listAuditLogs, type AuditEntry } from "@/shared/api/audit";
import { Card, HorizontalScrollArea } from "@weopen/ui";
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
        <button type="button" disabled>{error ? "READ BLOCKED" : "LIVE"}</button>
      </Card.Header>
      <Card.Content>
        {error ? <p role="alert">{error}</p> : null}
        <HorizontalScrollArea
          className="settings-audit-scroll"
          viewportClassName="settings-audit-table"
          role="table"
          aria-label="Audit log"
        >
          <div role="row"><span>Time (UTC)</span><span>Actor</span><span>Action</span><span>Resource</span><span>Details</span></div>
          {entries.length ? entries.map((entry) => (
            <div role="row" key={entry.id}>
              <span>{formatTimestamp(entry.createdAt)}</span>
              <span>{entry.actorUserId || "system"}</span>
              <span>{entry.action}</span>
              <span>{entry.targetType}</span>
              <span>{entry.targetId || metadataSummary(entry.metadata)}</span>
            </div>
          )) : (
            <div role="row">
              <span>—</span><span>—</span><span>No audit entries yet</span><span>—</span><span>—</span>
            </div>
          )}
        </HorizontalScrollArea>
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
