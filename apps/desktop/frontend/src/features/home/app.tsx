import { useState } from "react";
import { Button } from "@weopen/ui";
import { DesktopDashboard } from "@/features/dashboard/DesktopDashboard";
import { DesktopTools } from "@/features/devtools/DesktopTools";
import { RemoteApiSettings } from "@/features/settings/RemoteApiSettings";
import {
  loadRemoteApiSettings,
  type RemoteApiSettings as RemoteApiSettingsValue
} from "@/lib/apiClient";
import "./style.css";

type DesktopTab = "dashboard" | "settings" | "tools";

const tabs: Array<{ id: DesktopTab; label: string; description: string }> = [
  {
    description: "查看远程平台健康状态与插件概览",
    id: "dashboard",
    label: "仪表盘"
  },
  {
    description: "保存 API 地址与本机 session token",
    id: "settings",
    label: "远程 API"
  },
  {
    description: "在桌面端使用本地开发者工具",
    id: "tools",
    label: "工具箱"
  }
];

export function App() {
  const [activeTab, setActiveTab] = useState<DesktopTab>("dashboard");
  const [settings, setSettings] = useState<RemoteApiSettingsValue>(() => loadRemoteApiSettings());

  function handleSettingsSaved(nextSettings: RemoteApiSettingsValue) {
    setSettings(nextSettings);
    setActiveTab("dashboard");
  }

  return (
    <main className="desktop-shell">
      <section className="desktop-header">
        <div>
          <p className="desktop-kicker">WeOpen Desktop · M7</p>
          <h1>个人管理平台桌面端</h1>
          <p>
            连接远程 WeOpen API、展示平台状态，并把 Web 端开发者工具复用到 Wails 桌面壳中。
          </p>
        </div>
        <Button onClick={() => window.location.reload()} variant="secondary">
          刷新桌面壳
        </Button>
      </section>

      <nav aria-label="Desktop sections" className="desktop-tabs">
        {tabs.map((tab) => (
          <button
            aria-current={activeTab === tab.id ? "page" : undefined}
            className={activeTab === tab.id ? "desktop-tab active" : "desktop-tab"}
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            type="button"
          >
            <strong>{tab.label}</strong>
            <span>{tab.description}</span>
          </button>
        ))}
      </nav>

      {activeTab === "dashboard" ? (
        <DesktopDashboard onOpenSettings={() => setActiveTab("settings")} settings={settings} />
      ) : null}
      {activeTab === "settings" ? (
        <RemoteApiSettings onSaved={handleSettingsSaved} settings={settings} />
      ) : null}
      {activeTab === "tools" ? <DesktopTools /> : null}
    </main>
  );
}
