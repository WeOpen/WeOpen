"use client";

import { useMemo, useState } from "react";
import { Card } from "@weopen/ui";
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
  const [activeTab, setActiveTab] = useState<ToolTab>("json");
  const active = tabs.find((tab) => tab.id === activeTab) ?? tabs[0];
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
      <div className="page-header">
        <div className="page-kicker">Devtools</div>
        <h1 className="page-title">{manifest?.name ?? "Developer tools"}</h1>
        <p className="page-description">
          A local-first programmer toolbox for JSON, encoding, time, UUID, JWT, hash/HMAC, and regex tasks. Client-safe
          tools run in the browser and avoid backend round-trips.
        </p>
      </div>

      <div className="devtools-stats">
        <Card title="Available tools" description={`${availableCount} client-safe tools`} />
        <Card title="Runtime boundary" description="client-only for v1 sensitive inputs" />
        <Card title="Deferred" description={`${deferredCount} parser awaiting dependency approval`} />
        <Card title="Categories" description={`${categories} focused tool groups`} />
      </div>

      <div className="devtools-layout">
        <aside className="devtools-sidebar" aria-label="Developer tool categories">
          <div className="devtools-tabs" role="tablist">
            {tabs.map((tab) => (
              <button
                aria-selected={activeTab === tab.id}
                className={activeTab === tab.id ? "devtools-tab devtools-tab-active" : "devtools-tab"}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                role="tab"
                type="button"
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="tool-catalog">
            <h2>Runtime map</h2>
            <ul className="tool-list">
              {developerTools.map((tool) => (
                <li key={tool.id}>
                  <span>{tool.name}</span>
                  <span className={tool.status === "available" ? "tool-badge" : "tool-badge tool-badge-warning"}>
                    {tool.status === "available" ? tool.runtime : "deferred"}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <div className="devtools-active" role="tabpanel">
          {active.component}
        </div>
      </div>
    </section>
  );
}
