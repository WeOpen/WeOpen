"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { pluginManifests } from "@/plugins/registry";
import { listPlugins, type BackendPlugin } from "@/shared/api/plugins";
import { useRouteRefresh } from "@/shared/hooks/use-route-refresh";
import { Button, Card, DataTable, MetricCard, PixelIcon, Skeleton, StatusChip, type StatusChipTone } from "@weopen/ui";

const activityRows = [
  { icon: "blog", label: "BLOG ACTIVITY", value: 68 },
  { icon: "tools", label: "DEVTOOLS USAGE", value: 54 },
  { icon: "domains", label: "DOMAINS CHECKS", value: 32 },
  { icon: "storage", label: "STORAGE R2 I/O", value: 71 }
] as const;

const manifestVersionById = Object.fromEntries(
  pluginManifests.map((manifest) => [manifest.id, manifest.version])
);
const platformVersion = manifestVersionById.blog ?? "unknown";

const moduleDefinitions = [
  { icon: "blog", id: "blog", href: "/blog", name: "Blog Plugin", type: "PLUGIN", version: manifestVersionById.blog ?? platformVersion },
  { icon: "storage", id: "storage-r2", href: "/storage", name: "R2 Storage", type: "PLUGIN", version: manifestVersionById["storage-r2"] ?? platformVersion },
  { icon: "api", id: "api", href: "/api", name: "Go API", type: "SERVICE", version: platformVersion },
  { icon: "domains", id: "domains", href: "/domains", name: "Domains Monitor", type: "MODULE", version: manifestVersionById.domains ?? platformVersion },
  { icon: "tools", id: "devtools", href: "/tools", name: "DevTools", type: "TOOL", version: manifestVersionById.devtools ?? platformVersion },
  { icon: "plugins", id: "plugins", href: "/plugins", name: "Plugin Registry", type: "SERVICE", version: platformVersion }
] as const;

type ModuleRow = (typeof moduleDefinitions)[number] & {
  status: string;
};

export default function DashboardPage() {
  const [plugins, setPlugins] = useState<BackendPlugin[] | null>(null);

  const loadPlugins = useCallback(() => {
    let isMounted = true;
    void listPlugins().then((nextPlugins) => {
      if (isMounted) {
        setPlugins(nextPlugins);
      }
    }).catch(() => {
      if (isMounted) {
        setPlugins([]);
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useRouteRefresh({
    pathname: "/dashboard",
    refresh: loadPlugins
  });

  const pluginState = useMemo(() => new Map((plugins ?? []).map((plugin) => [plugin.id, plugin.enabled])), [plugins]);
  const activePlugins = plugins?.filter((plugin) => plugin.enabled).length ?? pluginManifests.length;
  const disabledPlugins = plugins?.filter((plugin) => !plugin.enabled).length ?? 0;
  const modules = moduleDefinitions.map((module) => ({
    ...module,
    status: statusForModule(module.id, pluginState)
  }));

  return (
    <>
      <section className="dashboard-metrics" aria-label="Platform status">
        <MetricCard icon={<PixelIcon name="api" />} label="API Status" value="ONLINE" description="UPTIME 7D 14H 22M" />
        <MetricCard
          icon={<PixelIcon name="plugins" />}
          label="Plugins Installed"
          value={plugins ? plugins.length : <Skeleton as="span" height={38} radius="sm" width={58} />}
          description={plugins ? `ACTIVE ${activePlugins} · DISABLED ${disabledPlugins}` : <Skeleton as="span" height={12} radius="pill" width={152} />}
        />
        <MetricCard icon={<PixelIcon name="health" />} label="System Health" value="98.6%" description="LAST 24 HOURS" />
        <MetricCard icon={<PixelIcon name="storage" />} label="Storage R2 Usage" value="42.7%" description="215.4 GB / 504.0 GB" />
      </section>

      <section className="dashboard-panels" aria-label="System overview">
        <Card className="dashboard-panel dashboard-system-overview">
          <Card.Header><Card.Title>System Overview</Card.Title></Card.Header>
          <Card.Content>
            <div className="dashboard-request-copy">
              <span>REQUESTS / MIN</span>
              <strong>1,308</strong>
              <small>TOTAL 1,342,940</small>
            </div>
            <svg className="dashboard-line-chart" viewBox="0 0 700 210" role="img" aria-label="Request trend">
              <g className="dashboard-grid-lines">
                <line x1="0" x2="700" y1="40" y2="40" />
                <line x1="0" x2="700" y1="96" y2="96" />
                <line x1="0" x2="700" y1="152" y2="152" />
              </g>
              <polyline className="dashboard-line-primary" points="0,140 42,125 84,132 126,120 168,138 210,115 252,126 294,58 336,130 378,91 420,57 462,112 504,84 546,104 588,58 630,88 672,94" />
            </svg>
            <div className="dashboard-live-feed"><span /> LIVE FEED</div>
          </Card.Content>
        </Card>

        <Card className="dashboard-panel dashboard-activity-overview">
          <Card.Header><Card.Title>Activity Overview</Card.Title></Card.Header>
          <Card.Content>
            {activityRows.map(({ icon, label, value }) => (
              <div className="dashboard-activity-row" key={label}>
                <span className="dashboard-activity-icon"><PixelIcon name={icon} /></span>
                <strong>{label}</strong>
                <i aria-hidden="true"><b style={{ width: `${value}%` }} /></i>
                <em>{value}%</em>
              </div>
            ))}
            <small>LAST 24 HOURS</small>
          </Card.Content>
        </Card>
      </section>

      <Card className="dashboard-directory" aria-label="Modules">
        <Card.Header><Card.Title>Modules</Card.Title></Card.Header>
        <Card.Content>
          <DataTable<ModuleRow>
            aria-label="WeOpen modules"
            className="dashboard-module-table"
            columns={[
              {
                id: "name",
                isRowHeader: true,
                label: "Name",
                render: ({ href, icon, name }) => (
                  <Link className="dashboard-module-member" href={href}>
                    <span className="dashboard-module-icon"><PixelIcon name={icon} /></span>
                    <strong>{name}</strong>
                  </Link>
                )
              },
              {
                id: "type",
                label: "Type",
                render: ({ type }) => type
              },
              {
                id: "status",
                label: "Status",
                render: ({ status }) => (
                  <StatusChip tone={toneForModuleStatus(status)}>{status}</StatusChip>
                )
              },
              {
                id: "version",
                label: "Version",
                render: ({ version }) => version
              },
              {
                id: "source",
                label: "Source",
                render: () => "WeOpen Team"
              },
              {
                className: "dashboard-module-actions-cell",
                id: "actions",
                label: "Actions",
                render: ({ name }) => (
                  <Button aria-label={`Open actions for ${name}`} isIconOnly size="icon-sm" variant="ghost">
                    <PixelIcon name="more" variant="bare" />
                  </Button>
                )
              }
            ]}
            getRowId={(module) => module.id}
            minWidth={1040}
            rows={modules}
          />
        </Card.Content>
      </Card>
    </>
  );
}

function statusForModule(id: string, pluginState: Map<string, boolean>) {
  if (id === "api" || id === "plugins") {
    return "RUNNING";
  }
  if (!pluginState.size || !pluginState.has(id)) {
    return "SYNCING";
  }
  return pluginState.get(id) ? "ACTIVE" : "DISABLED";
}

function toneForModuleStatus(status: string): StatusChipTone {
  if (status === "ACTIVE" || status === "RUNNING") {
    return "success";
  }
  if (status === "DISABLED") {
    return "danger";
  }
  return "warning";
}
