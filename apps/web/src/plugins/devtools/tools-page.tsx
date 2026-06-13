"use client";

import { useMemo, useState } from "react";
import type { PluginManifest } from "@weopen/plugin-sdk";
import { CronTool } from "./cron-tool";
import { EncodingTool } from "./encoding-tool";
import { HashTool } from "./hash-tool";
import { JsonTool } from "./json-tool";
import { JwtTool } from "./jwt-tool";
import { RegexTool } from "./regex-tool";
import { TimeTool } from "./time-tool";
import { developerTools } from "./tools";
import { UuidTool } from "./uuid-tool";
import { MetricCard, PixelIcon, StatusChip, Tabs } from "@weopen/ui";

const tabs = [
  { id: "json", label: "JSON", component: <JsonTool /> },
  { id: "encoding", label: "Encoding", component: <EncodingTool /> },
  { id: "time", label: "Time", component: <TimeTool /> },
  { id: "uuid", label: "UUID", component: <UuidTool /> },
  { id: "jwt", label: "JWT", component: <JwtTool /> },
  { id: "hash", label: "Hash/HMAC", component: <HashTool /> },
  { id: "regex", label: "Regex", component: <RegexTool /> },
  { id: "cron", label: "Cron", component: <CronTool /> }
] as const;

type ToolTab = (typeof tabs)[number]["id"];

export function ToolsPage({ manifest }: { manifest?: PluginManifest }) {
  void manifest;
  const [activeTab, setActiveTab] = useState<ToolTab>("json");
  const { availableCount, deferredCount, categories } = useMemo(() => {
    const available = developerTools.filter((tool) => tool.status === "available");
    const deferred = developerTools.filter((tool) => tool.status === "deferred");
    return {
      availableCount: available.length,
      deferredCount: deferred.length,
      categories: new Set(available.map((tool) => tool.category)).size
    };
  }, []);

  return (
    <section className="devtools-workspace">
      <div className="devtools-stats">
        <MetricCard icon={<PixelIcon name="tools" />} label="Available Tools" value={availableCount} description="All run in your browser" />
        <MetricCard icon={<PixelIcon name="runtime" />} label="Local Runtime" value="ACTIVE" description="V8 (Chrome) · isolated context" trend="active" trendDirection="up" />
        <MetricCard icon={<PixelIcon name="deferred" />} label="Deferred Tools" value={deferredCount} description="Require server context" />
        <MetricCard icon={<PixelIcon name="categories" />} label="Categories" value={categories} description="Filter & discover" />
      </div>

      <div className="devtools-layout">
        <Tabs
          className="devtools-tabs-shell"
          orientation="vertical"
          selectedKey={activeTab}
          onSelectionChange={(key) => setActiveTab(String(key) as ToolTab)}
        >
          <aside className="devtools-sidebar" aria-label="Developer tool categories">
            <Tabs.ListContainer>
              <Tabs.List aria-label="Developer tool categories" className="devtools-tabs">
                {tabs.map((tab) => (
                  <Tabs.Tab id={tab.id} key={tab.id}>
                    {tab.label}
                    <Tabs.Indicator />
                  </Tabs.Tab>
                ))}
              </Tabs.List>
            </Tabs.ListContainer>

            <div className="tool-catalog">
              <h2>Runtime Map</h2>
              <ul className="tool-list">
                {developerTools.map((tool) => (
                  <li key={tool.id}>
                    <span>{tool.name}</span>
                    <StatusChip tone={tool.status === "available" ? "success" : "warning"}>
                      {tool.status === "available" ? tool.runtime : "deferred"}
                    </StatusChip>
                  </li>
                ))}
              </ul>
            </div>
          </aside>

          <div className="devtools-active">
            {tabs.map((tab) => (
              <Tabs.Panel id={tab.id} key={tab.id}>
                {tab.component}
              </Tabs.Panel>
            ))}
          </div>
        </Tabs>
      </div>
    </section>
  );
}
