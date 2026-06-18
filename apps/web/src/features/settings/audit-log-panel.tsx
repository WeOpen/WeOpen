"use client";

import { useCallback, useMemo, useState } from "react";
import { listAuditLogs, type AuditEntry } from "@/shared/api/audit";
import { formatTimestamp } from "@/shared/format";
import { useRouteRefresh } from "@/shared/hooks/use-route-refresh";
import { Button, Card, DataTable, Input, SelectField, SkeletonStack, StatusChip } from "@weopen/ui";

export function AuditLogPanel() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [resourceFilter, setResourceFilter] = useState("all");

  const fetchEntries = useCallback(async () => {
    const nextEntries = await listAuditLogs();
    setEntries(nextEntries);
    setError("");
  }, []);

  const loadAuditLogs = useCallback(() => {
    let isMounted = true;
    void fetchEntries()
      .catch((err: unknown) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "审计日志读取失败");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [fetchEntries]);

  useRouteRefresh({
    pathname: "/settings",
    refresh: loadAuditLogs
  });

  const resourceOptions = useMemo(() => {
    const resources = Array.from(new Set(entries.map((entry) => entry.targetType).filter(Boolean))).sort();
    return [
      { label: "All resources", value: "all" },
      ...resources.map((resource) => ({ label: resource, value: resource }))
    ];
  }, [entries]);

  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return entries.filter((entry) => {
      const matchesResource = resourceFilter === "all" || entry.targetType === resourceFilter;
      if (!matchesResource) return false;
      if (!query) return true;
      const searchable = [
        entry.actorUserId,
        entry.action,
        entry.pluginId,
        entry.targetId,
        entry.targetType,
        metadataSummary(entry.metadata)
      ].filter(Boolean).join(" ").toLowerCase();
      return searchable.includes(query);
    });
  }, [entries, resourceFilter, searchQuery]);

  async function onRefresh() {
    setIsRefreshing(true);
    try {
      await fetchEntries();
    } catch (err) {
      setError(err instanceof Error ? err.message : "审计日志刷新失败");
    } finally {
      setIsRefreshing(false);
      setIsLoading(false);
    }
  }

  return (
    <Card className="settings-audit-log">
      <Card.Header>
        <Card.Title>Audit Log</Card.Title>
        <StatusChip tone={error ? "danger" : "success"}>{error ? "READ BLOCKED" : `${filteredEntries.length} shown`}</StatusChip>
      </Card.Header>
      <Card.Content>
        <div className="settings-audit-toolbar">
          <Input
            aria-label="Search audit logs"
            name="auditSearch"
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search action, actor, resource, or metadata"
            value={searchQuery}
          />
          <SelectField
            aria-label="Filter audit resources"
            label="Resource"
            onChange={setResourceFilter}
            options={resourceOptions}
            value={resourceFilter}
          />
          <Button isPending={isRefreshing} onPress={onRefresh} variant="secondary">Refresh</Button>
        </div>
        {error ? <p role="alert">{error}</p> : null}
        {isLoading ? (
          <div aria-busy="true" className="weopen-data-table settings-audit-table">
            <SkeletonStack rowHeight={48} rows={6} widths={["100%", "94%", "86%", "90%"]} />
          </div>
        ) : (
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
          emptyDescription="No audit entries match the current search and resource filter."
          emptyTitle="No matching audit entries"
          getRowId={(entry) => entry.id}
          minWidth={760}
          rows={filteredEntries}
        />
        )}
      </Card.Content>
    </Card>
  );
}

function metadataSummary(metadata: Record<string, unknown>): string {
  if (!metadata || typeof metadata !== "object") {
    return "none";
  }
  const keys = Object.keys(metadata);
  if (keys.length === 0) {
    return "none";
  }
  return keys.slice(0, 2).map((key) => `${key}:${String(metadata[key])}`).join(" / ");
}
