"use client";

import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/shared/layout/app-shell";
import { pluginManifests } from "@/plugins/registry";
import { currentUser, hasPermission, type AuthUser } from "@/shared/api/auth";
import { listPlugins, setPluginEnabled, type BackendPlugin } from "@/shared/api/plugins";
import { Card, Button, StatusChip } from "@weopen/ui";

export default function PluginsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [plugins, setPlugins] = useState<BackendPlugin[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingPluginId, setPendingPluginId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    void Promise.allSettled([currentUser(), listPlugins()]).then(([userResult, pluginResult]) => {
      if (!isMounted) return;
      setUser(userResult.status === "fulfilled" ? userResult.value?.user ?? null : null);
      if (pluginResult.status === "fulfilled") {
        setPlugins(pluginResult.value);
        setError(null);
      } else {
        setError(pluginResult.reason instanceof Error ? pluginResult.reason.message : "插件状态读取失败");
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  const canManagePlugins = hasPermission(user, "plugin:manage");
  const mergedPlugins = useMemo(() => mergePluginState(plugins), [plugins]);
  const activeCount = mergedPlugins.filter((plugin) => plugin.enabled).length;
  const selectedPlugin = mergedPlugins[0];

  async function onToggle(plugin: PluginView) {
    if (!canManagePlugins || pendingPluginId) return;
    setPendingPluginId(plugin.id);
    setError(null);
    try {
      const updated = await setPluginEnabled(plugin.id, !plugin.enabled);
      setPlugins(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "插件状态保存失败");
    } finally {
      setPendingPluginId(null);
    }
  }

  return (
    <AppShell currentPath="/plugins">
      <section className="plugin-registry-page">
        <div className="plugin-registry-main">
          <div className="plugin-registry-hero">
            <span>Plugin Registry</span>
            <h1><strong>{String(activeCount).padStart(2, "0")}</strong> Active</h1>
            <p>Backend registry state • permission-aware actions • no mock manifest state</p>
            {error ? <p className="plugin-registry-error" role="alert">{error}</p> : null}
          </div>

          <section className="plugin-grid" aria-label="Plugin list">
            {mergedPlugins.map((plugin, index) => (
              <Card className={plugin.enabled ? "plugin-card plugin-card-active" : "plugin-card plugin-card-disabled"} key={plugin.id}>
                <Card.Header>
                  <span className="plugin-card-icon">{iconForPlugin(plugin.id)}</span>
                  <div>
                    <Card.Title>{displayName(plugin.id, plugin.name)}</Card.Title>
                    <Card.Description>{englishDescription(plugin.id, plugin.description ?? "")}</Card.Description>
                  </div>
                  <StatusChip tone={plugin.enabled ? "success" : "neutral"}>{plugin.enabled ? "Enabled" : "Disabled"}</StatusChip>
                </Card.Header>
                <Card.Content>
                  <dl className="plugin-card-specs">
                    <div><dt>Version</dt><dd>{plugin.version}</dd></div>
                    <div><dt>Route Prefix</dt><dd>{plugin.navigation?.[0]?.path ?? "/plugins"}</dd></div>
                    <div><dt>Permissions</dt><dd>{plugin.permissions.length || "public"}</dd></div>
                    <div><dt>Order</dt><dd>{String(index + 1).padStart(2, "0")}</dd></div>
                  </dl>
                </Card.Content>
                <Card.Footer>
                  <Button
                    isDisabled={!canManagePlugins}
                    isPending={pendingPluginId === plugin.id}
                    onPress={() => onToggle(plugin)}
                    size="sm"
                    variant={plugin.enabled ? "secondary" : "primary"}
                  >
                    {canManagePlugins ? (plugin.enabled ? "Disable" : "Enable") : "Read only"}
                  </Button>
                  <a aria-disabled={!plugin.enabled} href={plugin.enabled ? plugin.navigation?.[0]?.path ?? `/plugins/${plugin.id}` : undefined}>
                    Open
                  </a>
                </Card.Footer>
              </Card>
            ))}
          </section>
        </div>

        <aside className="plugin-inspector" aria-label="Manifest inspector">
          <Button fullWidth isDisabled variant="secondary">↻ Live API Registry</Button>
          <p>{plugins ? "Synced from /api/plugins" : "Reading backend registry..."}</p>
          {selectedPlugin ? (
            <>
              <Card>
                <Card.Header>
                  <Card.Title>Manifest Inspector</Card.Title>
                  <span className="inspector-order">● {selectedPlugin.enabled ? "ENABLED" : "DISABLED"}</span>
                </Card.Header>
                <Card.Content>
                  <pre>{JSON.stringify(selectedPlugin, null, 2)}</pre>
                </Card.Content>
              </Card>
              <Card>
                <Card.Header><Card.Title>Permissions</Card.Title></Card.Header>
                <Card.Content className="plugin-inspector-list">
                  {(selectedPlugin.permissions.length ? selectedPlugin.permissions : ["public"]).map((permission) => (
                    <div key={permission}><span>{permission}</span><strong>{permission === "public" ? "OPEN" : "REQUIRED"}</strong></div>
                  ))}
                </Card.Content>
              </Card>
              <Card>
                <Card.Header><Card.Title>Routes</Card.Title></Card.Header>
                <Card.Content className="plugin-inspector-list">
                  {(selectedPlugin.navigation?.length ? selectedPlugin.navigation : [{ path: "/plugins", title: "Registry" }]).map((route) => (
                    <div key={route.path}><span>{route.path}</span><strong>{selectedPlugin.enabled ? "ACTIVE" : "DISABLED"}</strong></div>
                  ))}
                </Card.Content>
              </Card>
            </>
          ) : null}
        </aside>
      </section>
    </AppShell>
  );
}

type PluginView = BackendPlugin;

function mergePluginState(plugins: BackendPlugin[] | null): PluginView[] {
  const backendById = new Map((plugins ?? []).map((plugin) => [plugin.id, plugin]));
  return pluginManifests.map((manifest) => {
    const backend = backendById.get(manifest.id);
    return {
      id: manifest.id,
      name: backend?.name ?? manifest.name,
      description: backend?.description ?? manifest.description ?? "",
      version: backend?.version ?? manifest.version,
      permissions: backend?.permissions ?? manifest.permissions,
      navigation: backend?.navigation ?? manifest.nav,
      enabled: backend?.enabled ?? true
    };
  });
}

function displayName(pluginId: string, fallback: string) {
  const names: Record<string, string> = {
    blog: "Blog",
    devtools: "DevTools",
    domains: "Domains",
    "storage-r2": "Storage-R2"
  };
  return names[pluginId] ?? fallback;
}

function englishDescription(pluginId: string, fallback: string) {
  const descriptions: Record<string, string> = {
    blog: "Blog engine with posts, categories, tags, and feeds.",
    devtools: "Developer tools, system inspector, and runtime utilities.",
    domains: "Domains overview and TLS certificate inspection (read-only).",
    "storage-r2": "Cloud storage adapter for Cloudflare R2 bucket operations."
  };
  return descriptions[pluginId] ?? fallback;
}

function iconForPlugin(pluginId: string) {
  if (pluginId === "blog") return "▤";
  if (pluginId === "storage-r2") return "◉";
  if (pluginId === "domains") return "◎";
  return "</>";
}
