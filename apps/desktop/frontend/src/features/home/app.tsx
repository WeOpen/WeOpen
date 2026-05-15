import { useState } from "react";
import { AdminShell, Button, type AdminNavigationItem } from "@weopen/ui";
import { DesktopDashboard } from "@/features/dashboard/DesktopDashboard";
import { DesktopTools } from "@/features/devtools/DesktopTools";
import { RemoteApiSettings } from "@/features/settings/RemoteApiSettings";
import {
  loadRemoteApiSettings,
  type RemoteApiSettings as RemoteApiSettingsValue
} from "@/lib/apiClient";
import "@weopen/ui/admin.css";
import "./style.css";

type DesktopTab = "dashboard" | "settings" | "tools";

const navItems: AdminNavigationItem[] = [
  {
    description: "Remote platform status and plugins",
    href: "#dashboard",
    label: "Dashboard",
    tone: "primary"
  },
  {
    description: "API base URL and local session token",
    href: "#settings",
    label: "Remote API"
  },
  {
    description: "Shared Web devtools core",
    href: "#tools",
    label: "Tools"
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
    <AdminShell
      actionSlot={
        <Button onClick={() => window.location.reload()} variant="secondary">
          Reload shell
        </Button>
      }
      appMark="W"
      appName="WeOpen Desktop"
      brandHref="#dashboard"
      currentPath={`#${activeTab}`}
      navItems={navItems}
      renderNavItem={(item, className, isActive) => (
        <button
          aria-current={isActive ? "page" : undefined}
          className={className}
          onClick={() => setActiveTab(item.href.replace("#", "") as DesktopTab)}
          type="button"
        >
          <span>
            <strong>{item.label}</strong>
            {item.description ? <small>{item.description}</small> : null}
          </span>
        </button>
      )}
      searchPlaceholder="Search desktop tools, remote API, plugin status..."
      statusLabel={settings.baseUrl ? "Remote API configured" : "Local mode"}
      subtitle="Shared Admin Shell"
    >
      <section className="page-header">
        <div className="page-kicker">WeOpen Desktop - M7</div>
        <h1 className="page-title">Desktop management console</h1>
        <p className="page-description">
          Desktop reuses the Web thesvg-style admin shell, design tokens, base components and SDK while keeping Wails-local settings separate.
        </p>
      </section>

      {activeTab === "dashboard" ? (
        <DesktopDashboard onOpenSettings={() => setActiveTab("settings")} settings={settings} />
      ) : null}
      {activeTab === "settings" ? (
        <RemoteApiSettings onSaved={handleSettingsSaved} settings={settings} />
      ) : null}
      {activeTab === "tools" ? <DesktopTools /> : null}
    </AdminShell>
  );
}
