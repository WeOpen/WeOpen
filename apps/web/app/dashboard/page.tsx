"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/shared/layout/app-shell";
import { pluginManifests } from "@/plugins/registry";
import { listPlugins, type BackendPlugin } from "@/shared/api/plugins";
import { Card, HorizontalScrollArea, MetricCard } from "@weopen/ui";

const activityRows = [
  { icon: "▤", isCodeIcon: false, label: "BLOG ACTIVITY", value: 68 },
  { icon: "</>", isCodeIcon: true, label: "DEVTOOLS USAGE", value: 54 },
  { icon: "◎", isCodeIcon: false, label: "DOMAINS CHECKS", value: 32 },
  { icon: "◉", isCodeIcon: false, label: "STORAGE R2 I/O", value: 71 }
] as const;

const manifestVersionById = Object.fromEntries(
  pluginManifests.map((manifest) => [manifest.id, manifest.version])
);
const platformVersion = manifestVersionById.blog ?? "unknown";

const moduleDefinitions = [
  { id: "blog", href: "/blog", name: "Blog Plugin", type: "PLUGIN", version: manifestVersionById.blog ?? platformVersion },
  { id: "storage-r2", href: "/storage", name: "R2 Storage", type: "PLUGIN", version: manifestVersionById["storage-r2"] ?? platformVersion },
  { id: "api", href: "/api", name: "Go API", type: "SERVICE", version: platformVersion },
  { id: "domains", href: "/domains", name: "Domains Monitor", type: "MODULE", version: manifestVersionById.domains ?? platformVersion },
  { id: "devtools", href: "/tools", name: "DevTools", type: "TOOL", version: manifestVersionById.devtools ?? platformVersion },
  { id: "plugins", href: "/plugins", name: "Plugin Registry", type: "SERVICE", version: platformVersion }
] as const;

export default function DashboardPage() {
  const [plugins, setPlugins] = useState<BackendPlugin[] | null>(null);

  useEffect(() => {
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

  const pluginState = useMemo(() => new Map((plugins ?? []).map((plugin) => [plugin.id, plugin.enabled])), [plugins]);
  const activePlugins = plugins?.filter((plugin) => plugin.enabled).length ?? pluginManifests.length;
  const disabledPlugins = plugins?.filter((plugin) => !plugin.enabled).length ?? 0;
  const modules = moduleDefinitions.map((module) => ({
    ...module,
    status: statusForModule(module.id, pluginState)
  }));

  return (
    <AppShell currentPath="/dashboard">
      <section className="dashboard-metrics" aria-label="Platform status">
        <MetricCard icon={<span>●</span>} label="API Status" value="ONLINE" description="UPTIME 7D 14H 22M" />
        <MetricCard icon={<span>✣</span>} label="Plugins Installed" value={plugins?.length ?? pluginManifests.length} description={`ACTIVE ${activePlugins} · DISABLED ${disabledPlugins}`} />
        <MetricCard icon={<span>⌁</span>} label="System Health" value="98.6%" description="LAST 24 HOURS" />
        <MetricCard icon={<span>◉</span>} label="Storage R2 Usage" value="42.7%" description="215.4 GB / 504.0 GB" />
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
            {activityRows.map(({ icon, isCodeIcon, label, value }) => (
              <div className="dashboard-activity-row" key={label}>
                <span className={isCodeIcon ? "dashboard-activity-icon dashboard-activity-icon-code" : "dashboard-activity-icon"}>{icon}</span>
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
          <HorizontalScrollArea
            className="dashboard-module-scroll"
            viewportClassName="dashboard-module-table"
            role="table"
            aria-label="WeOpen modules"
          >
            <div className="dashboard-module-table-head" role="row">
              <span role="columnheader">Name</span>
              <span role="columnheader">Type</span>
              <span role="columnheader">Status</span>
              <span role="columnheader">Version</span>
              <span role="columnheader">Source</span>
              <span role="columnheader">Actions</span>
            </div>
            {modules.map(({ href, name, status, type, version }) => (
              <div className="dashboard-module-row" role="row" key={name}>
                <Link className="dashboard-module-member" href={href} role="cell">
                  <span className={iconClassForName(name)}>{iconForName(name)}</span>
                  <strong>{name}</strong>
                </Link>
                <span role="cell">{type}</span>
                <span className="dashboard-module-status" role="cell"><i /> {status}</span>
                <span role="cell">{version}</span>
                <span role="cell">WeOpen Team</span>
                <span role="cell">···</span>
              </div>
            ))}
          </HorizontalScrollArea>
        </Card.Content>
      </Card>
    </AppShell>
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

function iconForName(name: string) {
  if (name.includes("Blog")) return "▤";
  if (name.includes("R2")) return "◉";
  if (name.includes("API")) return ">_";
  if (name.includes("Domains")) return "◎";
  if (name.includes("Dev")) return "</>";
  return "✣";
}

function iconClassForName(name: string) {
  return name.includes("API") || name.includes("Dev")
    ? "dashboard-module-icon dashboard-module-icon-code"
    : "dashboard-module-icon";
}
