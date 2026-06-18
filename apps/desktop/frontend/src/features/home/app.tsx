import { useEffect, useState } from "react";
import { AdminShell, Button, type AdminNavigationItem } from "@weopen/ui";
import { DesktopDashboard } from "@/features/dashboard/DesktopDashboard";
import { DesktopTools } from "@/features/devtools/DesktopTools";
import { RemoteApiSettings } from "@/features/settings/RemoteApiSettings";
import {
  loadRemoteApiSettings,
  type RemoteApiSettings as RemoteApiSettingsValue
} from "@/shared/api/apiClient";
import "@weopen/ui/styles.css";
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
  const [activeTab, setActiveTab] = useState<DesktopTab>(() => tabFromHash(window.location.hash));
  const [settings, setSettings] = useState<RemoteApiSettingsValue>(() => loadRemoteApiSettings());

  useEffect(() => {
    function syncTabFromHash() {
      setActiveTab(tabFromHash(window.location.hash));
    }

    window.addEventListener("hashchange", syncTabFromHash);
    return () => window.removeEventListener("hashchange", syncTabFromHash);
  }, []);

  function selectTab(tab: DesktopTab) {
    setActiveTab(tab);
    const nextHash = `#${tab}`;
    if (window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
  }

  function handleSettingsSaved(nextSettings: RemoteApiSettingsValue) {
    setSettings(nextSettings);
    selectTab("dashboard");
  }

  return (
    <AdminShell
      actionSlot={
        <Button onPress={() => window.location.reload()} variant="secondary">
          Reload shell
        </Button>
      }
      appMark="W"
      appName="WeOpen Desktop"
      brandHref="#dashboard"
      currentPath={`#${activeTab}`}
      navItems={navItems}
      onNavItemSelect={(item) => selectTab(item.href.replace("#", "") as DesktopTab)}
      searchPlaceholder="Search desktop tools, remote API, plugin status..."
      statusLabel={settings.baseUrl ? "Remote API configured" : "Local mode"}
      subtitle="Shared Admin Shell"
    >
      <section className="page-header">
        <div className="page-kicker">WeOpen Desktop - M7</div>
        <h1 className="page-title">Desktop management console</h1>
        <p className="page-description">
          Desktop reuses the custom Nothing-style admin shell, shared components and SDK while keeping Wails-local settings separate.
        </p>
      </section>

      {activeTab === "dashboard" ? (
        <DesktopDashboard onOpenSettings={() => selectTab("settings")} settings={settings} />
      ) : null}
      {activeTab === "settings" ? (
        <RemoteApiSettings onSaved={handleSettingsSaved} settings={settings} />
      ) : null}
      {activeTab === "tools" ? <DesktopTools /> : null}
    </AdminShell>
  );
}

function tabFromHash(hash: string): DesktopTab {
  if (hash === "#settings") {
    return "settings";
  }
  if (hash === "#tools") {
    return "tools";
  }
  return "dashboard";
}
