"use client";

import { useCallback, useMemo, useState } from "react";
import { getRouteCatalog, type ApiRouteCatalog, type ApiRouteDefinition, type ApiRouteGroup } from "@/shared/api/routes";
import { useRouteRefresh } from "@/shared/hooks/use-route-refresh";
import { Card, MetricCard, PageHeader, PixelIcon, SkeletonStack, StatusChip } from "@weopen/ui";

type ApiDirectoryProps = {
  initialCatalog: ApiRouteCatalog | null;
  initialError?: string;
};

export function ApiDirectory({ initialCatalog, initialError = "" }: ApiDirectoryProps) {
  const [catalog, setCatalog] = useState<ApiRouteCatalog | null>(initialCatalog);
  const [error, setError] = useState<string | null>(initialError || null);
  const [isLoading, setIsLoading] = useState(!initialCatalog && !initialError);
  const [openRouteIds, setOpenRouteIds] = useState<Set<string>>(() => {
    const firstRoute = initialCatalog?.groups.flatMap((group) => group.routes)[0];
    return new Set(firstRoute ? [firstRoute.id] : []);
  });

  const loadCatalog = useCallback(() => {
    let isActive = true;
    setIsLoading(true);
    void getRouteCatalog()
      .then((nextCatalog) => {
        if (!isActive) return;
        setCatalog(nextCatalog);
        setError(null);
        const firstRoute = nextCatalog.groups.flatMap((group) => group.routes)[0];
        setOpenRouteIds((current) => current.size ? current : new Set(firstRoute ? [firstRoute.id] : []));
      })
      .catch((err) => {
        if (!isActive) return;
        setError(err instanceof Error ? err.message : "接口目录读取失败");
      })
      .finally(() => {
        if (!isActive) return;
        setIsLoading(false);
      });
    return () => {
      isActive = false;
    };
  }, []);

  useRouteRefresh({
    pathname: "/api",
    refresh: loadCatalog,
    retryWhen: !catalog && !error && isLoading,
    serverRefresh: true
  });

  const groups = useMemo(() => catalog?.groups ?? [], [catalog]);
  const stats = useMemo(() => routeStats(groups), [groups]);

  function toggleRoute(routeId: string) {
    setOpenRouteIds((current) => {
      const next = new Set(current);
      if (next.has(routeId)) {
        next.delete(routeId);
      } else {
        next.add(routeId);
      }
      return next;
    });
  }

  return (
    <section className="api-workspace">
      <PageHeader
        actions={<StatusChip tone={catalog ? "success" : error ? "danger" : "neutral"}>{catalog ? (isLoading ? "Refreshing" : "Live Catalog") : error ? "Offline" : "Loading"}</StatusChip>}
        eyebrow="API"
        title="Go API"
        description="Backend-owned HTTP directory for core services and plugin routes."
      />

      <div className="storage-stats">
        <MetricCard icon={<PixelIcon name="service" />} label="Groups" value={String(stats.groupCount).padStart(2, "0")} description="Backend catalog sections" trend="live" trendDirection="up" />
        <MetricCard icon={<PixelIcon name="routes" />} label="Routes" value={String(stats.routeCount).padStart(2, "0")} description="Core and plugin endpoints" />
        <MetricCard icon={<PixelIcon name="plugins" />} label="Plugin routes" value={String(stats.pluginRouteCount).padStart(2, "0")} description="Mounted behind auth" />
        <MetricCard icon={<PixelIcon name="auth" />} label="Permissions" value={String(stats.permissionCount).padStart(2, "0")} description="RBAC scopes in use" />
      </div>

      {error ? (
        <Card className="api-route-panel">
          <Card.Header>
            <Card.Title>Route Catalog</Card.Title>
            <StatusChip tone="danger">Error</StatusChip>
          </Card.Header>
          <Card.Content>
            <p className="api-route-error" role="alert">{error}</p>
          </Card.Content>
        </Card>
      ) : null}

      {!catalog && isLoading && !error ? (
        <Card className="api-route-panel">
          <Card.Header>
            <Card.Title>Route Catalog</Card.Title>
            <StatusChip tone="neutral">Syncing</StatusChip>
          </Card.Header>
          <Card.Content>
            <SkeletonStack className="api-route-loading" rowHeight={56} rows={3} widths={["100%"]} />
          </Card.Content>
        </Card>
      ) : null}

      {groups.map((group) => (
        <ApiRouteGroupPanel group={group} key={group.id} onToggleRoute={toggleRoute} openRouteIds={openRouteIds} />
      ))}
    </section>
  );
}

function ApiRouteGroupPanel({
  group,
  onToggleRoute,
  openRouteIds
}: {
  group: ApiRouteGroup;
  onToggleRoute: (routeId: string) => void;
  openRouteIds: Set<string>;
}) {
  return (
    <Card className="api-route-panel">
      <Card.Header>
        <div>
          <Card.Title>{group.title}</Card.Title>
          {group.description ? <Card.Description>{group.description}</Card.Description> : null}
        </div>
        <StatusChip tone="neutral">{group.routes.length} Routes</StatusChip>
      </Card.Header>
      <Card.Content>
        <div className="api-route-list">
          {group.routes.map((route) => {
            const isOpen = openRouteIds.has(route.id);
            return (
              <article className={isOpen ? "api-route-item api-route-item-open" : "api-route-item"} key={route.id}>
                <button
                  aria-controls={`${route.id}-details`}
                  aria-expanded={isOpen}
                  className="api-route-row"
                  onClick={() => onToggleRoute(route.id)}
                  type="button"
                >
                  <span className={`api-method api-method-${route.method.toLowerCase()}`}>{route.method}</span>
                  <span className="api-route-main">
                    <code>{route.path}</code>
                    <span>{route.summary}</span>
                  </span>
                  <span className="api-route-access">{route.auth}</span>
                  <span className="api-route-meta">{route.parameters?.length ?? 0} Params</span>
                  <span className="api-route-toggle" aria-hidden="true">
                    <PixelIcon name="chevron-down" variant="bare" />
                  </span>
                </button>
                {isOpen ? <ApiRouteDetails route={route} /> : null}
              </article>
            );
          })}
        </div>
      </Card.Content>
    </Card>
  );
}

function ApiRouteDetails({ route }: { route: ApiRouteDefinition }) {
  const parameters = route.parameters ?? [];
  const permissions = route.permissions ?? [];

  return (
    <div className="api-route-details" id={`${route.id}-details`}>
      <section>
        <h3>Parameters</h3>
        {parameters.length ? (
          <div className="api-parameter-list">
            {parameters.map((parameter) => (
              <div className="api-parameter-row" key={`${parameter.in}-${parameter.name}`}>
                <span>{parameter.in}</span>
                <code>{parameter.name}</code>
                <strong>{parameter.required ? "Required" : "Optional"}</strong>
                <p>{parameter.description}</p>
                {parameter.example !== undefined ? <small>{stringifyInline(parameter.example)}</small> : null}
              </div>
            ))}
          </div>
        ) : (
          <p className="api-route-empty">No parameters</p>
        )}
      </section>

      <section>
        <h3>Access</h3>
        <div className="api-permission-list">
          <StatusChip tone={route.auth === "Public" ? "success" : route.auth === "Session" ? "accent" : "warning"}>{route.auth}</StatusChip>
          {permissions.length ? permissions.map((permission) => <code key={permission}>{permission}</code>) : <span>No RBAC scope</span>}
        </div>
      </section>

      <section>
        <h3>Request</h3>
        <pre>{formatExample(route.requestExample)}</pre>
      </section>

      <section>
        <h3>Response</h3>
        <pre>{formatExample(route.responseExample)}</pre>
      </section>
    </div>
  );
}

function routeStats(groups: ApiRouteGroup[]) {
  const permissionSet = new Set<string>();
  const routeCount = groups.reduce((sum, group) => sum + group.routes.length, 0);
  const pluginRouteCount = groups.filter((group) => group.id.startsWith("plugin-")).reduce((sum, group) => sum + group.routes.length, 0);
  for (const route of groups.flatMap((group) => group.routes)) {
    for (const permission of route.permissions ?? []) {
      permissionSet.add(permission);
    }
  }
  return {
    groupCount: groups.length,
    routeCount,
    pluginRouteCount,
    permissionCount: permissionSet.size
  };
}

function formatExample(value: unknown): string {
  if (value === undefined || value === null) {
    return "No body";
  }
  return JSON.stringify(value, null, 2);
}

function stringifyInline(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  return JSON.stringify(value);
}
