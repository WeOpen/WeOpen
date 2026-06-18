"use client";

import { AdminShell, ThemeToggle, createAdminNavigation } from "@weopen/ui";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SessionControl } from "@/features/auth/session-control";
import { pluginManifests } from "@/plugins/registry";
import { currentUser, hasAnyPermission, type AuthUser } from "@/shared/api/auth";
import { PLUGIN_REGISTRY_CHANGED_EVENT, listPlugins, type BackendPlugin } from "@/shared/api/plugins";
import { useRouteRefresh } from "@/shared/hooks/use-route-refresh";

/** AppShell composes the shared custom Nothing-style management shell for Web routes. */
export function AppShell({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [plugins, setPlugins] = useState<BackendPlugin[] | null>(null);

  const loadShellState = useCallback(() => {
    let isMounted = true;
    void Promise.allSettled([currentUser(), listPlugins()]).then(([userResult, pluginResult]) => {
      if (!isMounted) {
        return;
      }
      setUser(userResult.status === "fulfilled" ? userResult.value?.user ?? null : null);
      setPlugins(pluginResult.status === "fulfilled" ? pluginResult.value : null);
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useRouteRefresh({
    refresh: loadShellState
  });

  useEffect(() => {
    function onPluginRegistryChanged(event: Event) {
      setPlugins((event as CustomEvent<BackendPlugin[]>).detail);
    }

    window.addEventListener(PLUGIN_REGISTRY_CHANGED_EVENT, onPluginRegistryChanged);
    return () => {
      window.removeEventListener(PLUGIN_REGISTRY_CHANGED_EVENT, onPluginRegistryChanged);
    };
  }, []);

  const navItems = useMemo(() => {
    const backendById = new Map((plugins ?? []).map((plugin) => [plugin.id, plugin]));
    const pluginItems = pluginManifests
      .filter((manifest) => {
        const backend = backendById.get(manifest.id);
        if (backend && !backend.enabled) {
          return false;
        }
        return hasAnyPermission(user, manifest.permissions);
      })
      .flatMap((manifest) =>
        (manifest.nav ?? []).map((item) => ({
          description: pluginDescription(item.path),
          href: item.path,
          label: item.title,
          order: item.order
        }))
      );
    return createAdminNavigation(pluginItems);
  }, [plugins, user]);

  return (
    <AdminShell
      appMark="W"
      appName="WeOpen"
      actionSlot={<ThemeToggle className="admin-theme-toggle" defaultTheme="dark" storageKey="weopen-theme" />}
      currentPath={pathname}
      environmentLabel={process.env.NODE_ENV?.toUpperCase() ?? "LOCAL"}
      footerActionSlot={<SessionControl compact />}
      linkComponent={Link}
      navItems={navItems}
      runtimeLabel="WEB"
      subtitle="Personal Management Platform"
      versionLabel={process.env.NEXT_PUBLIC_APP_VERSION ?? "0.1.0"}
    >
      {children}
    </AdminShell>
  );
}

function pluginDescription(path: string): string {
  if (path === "/blog") {
    return "Posts, drafts, taxonomy and cover media";
  }
  if (path === "/tools") {
    return "JSON, encoding, time, JWT and regex";
  }
  if (path === "/domains") {
    return "Cloudflare domains and DNS read-only checks";
  }
  if (path === "/storage") {
    return "R2 objects, media and backup files";
  }
  return "Built-in management module";
}
