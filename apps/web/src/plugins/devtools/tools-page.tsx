"use client";

import type { ComponentType, ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import type { PluginManifest } from "@weopen/plugin-sdk";
import { listDeveloperTools, type DeveloperToolsCatalog } from "@/shared/api/devtools";
import { useRouteRefresh } from "@/shared/hooks/use-route-refresh";
import type { DeveloperTool } from "./types";
import { CronTool } from "./cron-tool";
import { EncodingTool } from "./encoding-tool";
import { HashTool } from "./hash-tool";
import { JsonTool } from "./json-tool";
import { JwtTool } from "./jwt-tool";
import { RegexTool } from "./regex-tool";
import { TimeTool } from "./time-tool";
import { UuidTool } from "./uuid-tool";
import { Button, MetricCard, PixelIcon, SkeletonStack, StatusChip, Tabs } from "@weopen/ui";

export type ToolPanelProps = {
  statusSlot?: ReactNode;
};

const panelComponents: Record<string, ComponentType<ToolPanelProps>> = {
  cron: CronTool,
  encoding: EncodingTool,
  hash: HashTool,
  json: JsonTool,
  jwt: JwtTool,
  regex: RegexTool,
  time: TimeTool,
  uuid: UuidTool
};

const toolsRefreshPathnames = ["/tools", "/plugins/devtools"] as const;

type LoadState = "loading" | "ready" | "error";

export function ToolsPage({ manifest }: { manifest?: PluginManifest }) {
  const [activeTab, setActiveTab] = useState("json");
  const [catalog, setCatalog] = useState<DeveloperToolsCatalog>({ tools: [], panels: [] });
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);

  const loadCatalog = useCallback(() => {
    let isMounted = true;
    setLoadState((current) => current === "ready" ? current : "loading");
    setError(null);
    void listDeveloperTools().then(
      (nextCatalog) => {
        if (!isMounted) return;
        setCatalog(nextCatalog);
        setLoadState("ready");
      },
      (err: unknown) => {
        if (!isMounted) return;
        setError(err instanceof Error ? err.message : "Failed to read developer tools catalog.");
        setLoadState("error");
      }
    );
    return () => {
      isMounted = false;
    };
  }, []);

  useRouteRefresh({
    pathnames: toolsRefreshPathnames,
    refresh: loadCatalog
  });

  const panels = useMemo(
    () => catalog.panels.filter((panel) => panelComponents[panel.id]),
    [catalog.panels]
  );
  const toolsByPanelId = useMemo(() => toolsGroupedByPanel(catalog), [catalog]);

  const selectedTab = panels.some((panel) => panel.id === activeTab) ? activeTab : panels[0]?.id ?? activeTab;

  const { availableCount, deferredCount, categories, runtimes } = useMemo(() => {
    const available = catalog.tools.filter((tool) => tool.status === "available");
    const deferred = catalog.tools.filter((tool) => tool.status === "deferred");
    return {
      availableCount: available.length,
      deferredCount: deferred.length,
      categories: new Set(catalog.tools.map((tool) => tool.category)).size,
      runtimes: new Set(catalog.tools.map((tool) => tool.runtime)).size
    };
  }, [catalog.tools]);

  return (
    <section className="devtools-workspace">
      <div className="devtools-stats">
        <MetricCard icon={<PixelIcon name="tools" />} label="Available Tools" value={availableCount} description="All run in your browser" />
        <MetricCard icon={<PixelIcon name="runtime" />} label="Runtimes" value={runtimes} description="Synced from plugin API" trend={loadState === "ready" ? "active" : undefined} trendDirection="up" />
        <MetricCard icon={<PixelIcon name="deferred" />} label="Deferred Tools" value={deferredCount} description="Require server context" />
        <MetricCard icon={<PixelIcon name="categories" />} label="Categories" value={categories} description={manifest?.version ? `devtools v${manifest.version}` : "Backend catalog"} />
      </div>

      {loadState === "loading" ? <ToolCatalogLoadingState /> : null}
      {loadState === "error" ? <ToolCatalogError message={error} onRetry={loadCatalog} /> : null}
      {loadState === "ready" && panels.length === 0 ? <ToolCatalogState message="No runnable tool panels are registered." /> : null}

      {loadState === "ready" && panels.length > 0 ? (
      <div className="devtools-layout">
        <Tabs
          className="devtools-tabs-shell"
          orientation="vertical"
          selectedKey={selectedTab}
          onSelectionChange={(key) => setActiveTab(String(key))}
        >
          <aside className="devtools-sidebar" aria-label="Developer tool categories">
            <Tabs.ListContainer>
              <Tabs.List aria-label="Developer tool categories" className="devtools-tabs">
                {panels.map((panel) => (
                  <Tabs.Tab id={panel.id} key={panel.id}>
                    {panel.label}
                    <Tabs.Indicator />
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs.ListContainer>
          </aside>

          <div className="devtools-active">
            {panels.map((panel) => (
              <Tabs.Panel id={panel.id} key={panel.id}>
                {(() => {
                  const PanelComponent = panelComponents[panel.id];
                  return <PanelComponent statusSlot={<ToolStatusChips tools={toolsByPanelId.get(panel.id) ?? []} />} />;
                })()}
              </Tabs.Panel>
            ))}
          </div>
        </Tabs>
      </div>
      ) : null}
    </section>
  );
}

function toolsGroupedByPanel(catalog: DeveloperToolsCatalog) {
  const panelIdsByToolId = new Map<string, string>();
  for (const panel of catalog.panels) {
    for (const toolId of panel.toolIds) {
      panelIdsByToolId.set(toolId, panel.id);
    }
  }

  const groupedTools = new Map<string, DeveloperTool[]>();
  for (const tool of catalog.tools) {
    const panelId = tool.panelId ?? panelIdsByToolId.get(tool.id);
    if (!panelId) {
      continue;
    }
    groupedTools.set(panelId, [...(groupedTools.get(panelId) ?? []), tool]);
  }
  return groupedTools;
}

function ToolStatusChips({ tools }: { tools: DeveloperTool[] }) {
  const entries = uniqueStatusEntries(tools);
  if (!entries.length) {
    return null;
  }

  return (
    <div className="tool-status-chips" aria-label="Tool runtime status">
      {entries.map((entry) => (
        <StatusChip key={entry.key} tone={entry.tone}>
          {entry.label}
        </StatusChip>
      ))}
    </div>
  );
}

function uniqueStatusEntries(tools: DeveloperTool[]) {
  const entries = new Map<string, { key: string; label: string; tone: "success" | "warning" }>();
  for (const tool of tools) {
    if (tool.status === "deferred") {
      entries.set("deferred", { key: "deferred", label: "Deferred", tone: "warning" });
      continue;
    }
    const runtime = tool.runtime.toLowerCase();
    entries.set(`runtime-${runtime}`, {
      key: `runtime-${runtime}`,
      label: runtime,
      tone: "success"
    });
  }
  return [...entries.values()];
}

function ToolCatalogState({ message }: { message: string }) {
  return (
    <section className="tool-panel tool-catalog-state" aria-live="polite">
      <p>{message}</p>
    </section>
  );
}

function ToolCatalogLoadingState() {
  return (
    <section aria-busy="true" className="tool-panel tool-catalog-state" aria-live="polite">
      <SkeletonStack rowHeight={48} rows={5} widths={["100%", "92%", "84%", "76%"]} />
    </section>
  );
}

function ToolCatalogError({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <section className="tool-panel tool-catalog-state" role="alert">
      <p>{message ?? "Failed to read developer tools catalog."}</p>
      <Button onPress={onRetry}>Retry</Button>
    </section>
  );
}
