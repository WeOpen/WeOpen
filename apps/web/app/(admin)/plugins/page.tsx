"use client";

import type { CSSProperties, KeyboardEvent, MouseEvent, ReactNode } from "react";
import { useCallback, useMemo, useState } from "react";
import { hasPluginUI } from "@/plugins/registry";
import { currentUser, hasPermission, type AuthUser } from "@/shared/api/auth";
import { listPlugins, setPluginEnabled, type BackendPlugin, type BackendRouteDefinition } from "@/shared/api/plugins";
import { useRouteRefresh } from "@/shared/hooks/use-route-refresh";
import { Button, Card, PixelIcon, SkeletonStack, StatusChip } from "@weopen/ui";

type LoadState = "loading" | "ready" | "error";

const fallbackIcon = "plugins";

export default function PluginsPage() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [plugins, setPlugins] = useState<BackendPlugin[]>([]);
  const [selectedPluginId, setSelectedPluginId] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [pendingPluginId, setPendingPluginId] = useState<string | null>(null);

  const loadPluginRegistry = useCallback(() => {
    let isMounted = true;
    setLoadState((current) => current === "ready" ? current : "loading");
    void Promise.allSettled([currentUser(), listPlugins()]).then(([userResult, pluginResult]) => {
      if (!isMounted) return;
      setUser(userResult.status === "fulfilled" ? userResult.value?.user ?? null : null);
      if (pluginResult.status === "fulfilled") {
        setPlugins(pluginResult.value);
        setSelectedPluginId((current) => pluginResult.value.some((plugin) => plugin.id === current) ? current : pluginResult.value[0]?.id ?? null);
        setError(null);
        setLoadState("ready");
      } else {
        setError(pluginResult.reason instanceof Error ? pluginResult.reason.message : "Failed to read plugin registry.");
        setLoadState("error");
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  useRouteRefresh({
    pathname: "/plugins",
    refresh: loadPluginRegistry
  });

  const canManagePlugins = hasPermission(user, "plugin:manage");
  const activeCount = plugins.filter((plugin) => plugin.enabled).length;
  const routeCount = plugins.reduce((sum, plugin) => sum + plugin.routeCount, 0);
  const selectedPlugin = useMemo(
    () => plugins.find((plugin) => plugin.id === selectedPluginId) ?? plugins[0] ?? null,
    [plugins, selectedPluginId]
  );
  const selectedPluginIndex = selectedPlugin ? plugins.findIndex((plugin) => plugin.id === selectedPlugin.id) : -1;

  async function onToggle(plugin: BackendPlugin) {
    if (!canManagePlugins || pendingPluginId) return;
    setPendingPluginId(plugin.id);
    setError(null);
    try {
      const updated = await setPluginEnabled(plugin.id, !plugin.enabled);
      setPlugins(updated);
      setSelectedPluginId(plugin.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save plugin state.");
    } finally {
      setPendingPluginId(null);
    }
  }

  return (
    <section className="plugin-registry-page">
      <div className="plugin-registry-main">
        <header className="plugin-registry-hero">
          <span>Plugin Registry</span>
          <h1><strong>{String(activeCount).padStart(2, "0")}</strong> Active</h1>
          <p>{plugins.length} registered plugins • {routeCount} backend routes • API-owned manifest state</p>
          {error ? <p className="plugin-registry-error" role="alert">{error}</p> : null}
        </header>

        {loadState === "loading" ? <PluginLoadingState /> : null}
        {loadState === "ready" && plugins.length === 0 ? <PluginEmptyState /> : null}
        {plugins.length > 0 ? (
          <section className="plugin-grid" aria-label="Plugin list">
            {plugins.map((plugin) => (
              <PluginCard
                canManagePlugins={canManagePlugins}
                isPending={pendingPluginId === plugin.id}
                isSelected={selectedPlugin?.id === plugin.id}
                key={plugin.id}
                onSelect={() => setSelectedPluginId(plugin.id)}
                onToggle={() => onToggle(plugin)}
                plugin={plugin}
              />
            ))}
          </section>
        ) : null}
      </div>

      <PluginInspector orderIndex={selectedPluginIndex} plugin={selectedPlugin} />
    </section>
  );
}

type PluginCardProps = {
  canManagePlugins: boolean;
  isPending: boolean;
  isSelected: boolean;
  onSelect: () => void;
  onToggle: () => void;
  plugin: BackendPlugin;
};

function PluginCard({ canManagePlugins, isPending, isSelected, onSelect, onToggle, plugin }: PluginCardProps) {
  const primaryRoute = plugin.navigation?.[0]?.path;
  const href = plugin.enabled && primaryRoute ? primaryRoute : undefined;
  const selectedCardStyle = isSelected
    ? ({
        borderColor: "var(--accent)",
        boxShadow: "inset 0 0 0 1px var(--accent)"
      } satisfies CSSProperties)
    : undefined;

  function onCardKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) {
      return;
    }
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    onSelect();
  }

  function onControlClick(event: MouseEvent<HTMLElement>) {
    event.stopPropagation();
  }

  return (
    <Card
      aria-pressed={isSelected}
      className={[
        "plugin-card",
        plugin.enabled ? "plugin-card-active" : "plugin-card-disabled",
        isSelected ? "plugin-card-selected" : ""
      ].filter(Boolean).join(" ")}
      onClick={onSelect}
      onKeyDown={onCardKeyDown}
      role="button"
      style={selectedCardStyle}
      tabIndex={0}
    >
      <Card.Header>
        <div className="plugin-card-select">
          <span className="plugin-card-icon"><PixelIcon name={plugin.navigation?.[0]?.icon ?? fallbackIcon} /></span>
          <span>
            <strong>{plugin.name}</strong>
            <small>{plugin.id}</small>
          </span>
        </div>
        <StatusChip tone={plugin.enabled ? "success" : "danger"}>{plugin.enabled ? "Enabled" : "Disabled"}</StatusChip>
      </Card.Header>
      <Card.Content>
        <p>{plugin.description || "Backend manifest did not provide a description."}</p>
      </Card.Content>
      <Card.Footer>
        <Button
          isDisabled={!canManagePlugins}
          isPending={isPending}
          onClick={onControlClick}
          onPress={onToggle}
          size="sm"
          variant={plugin.enabled ? "danger" : "primary"}
        >
          {canManagePlugins ? (plugin.enabled ? "Disable" : "Enable") : "Read only"}
        </Button>
        {href ? <a href={href} onClick={onControlClick}>Open</a> : <span>{plugin.enabled ? "No route" : "Disabled"}</span>}
      </Card.Footer>
    </Card>
  );
}

function PluginInspector({ orderIndex, plugin }: { orderIndex: number; plugin: BackendPlugin | null }) {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  if (!plugin) {
    return (
      <aside className="plugin-inspector" aria-label="Plugin inspector">
        <Button fullWidth isDisabled variant="secondary"><PixelIcon name="routes" variant="bare" /> Live API Registry</Button>
        <p>Select a plugin after the backend registry loads.</p>
      </aside>
    );
  }

  const routes = plugin.routeGroup?.routes ?? [];
  const uiBound = hasPluginUI(plugin.id);
  const permissionSummary = plugin.permissions.length ? String(plugin.permissions.length) : "public";
  const orderLabel = orderIndex >= 0 ? String(orderIndex + 1).padStart(2, "0") : "none";

  function toggleInspectorCard(cardId: string) {
    setExpandedCards((current) => {
      const next = new Set(current);
      if (next.has(cardId)) {
        next.delete(cardId);
      } else {
        next.add(cardId);
      }
      return next;
    });
  }

  return (
    <aside className="plugin-inspector" aria-label="Plugin inspector">
      <div className="plugin-inspector-intro">
        <Button fullWidth isDisabled variant="secondary"><PixelIcon name="routes" variant="bare" /> Live API Registry</Button>
        <p>Synced from `/api/plugins`; route details are backend-owned.</p>
      </div>

      <Card className="plugin-inspector-summary-card">
        <Card.Header>
          <Card.Title>{plugin.name}</Card.Title>
          <StatusChip tone={plugin.enabled ? "success" : "danger"}>{plugin.enabled ? "Enabled" : "Disabled"}</StatusChip>
        </Card.Header>
        <Card.Content>
          <dl className="plugin-card-specs">
            <div><dt>ID</dt><dd>{plugin.id}</dd></div>
            <div><dt>Version</dt><dd>{plugin.version}</dd></div>
            <div><dt>Route Prefix</dt><dd>{plugin.routePrefix || "none"}</dd></div>
            <div><dt>Routes</dt><dd>{plugin.routeCount}</dd></div>
            <div><dt>Permissions</dt><dd>{permissionSummary}</dd></div>
            <div><dt>UI Binding</dt><dd>{uiBound ? "bound" : "missing"}</dd></div>
            <div><dt>Order</dt><dd>{orderLabel}</dd></div>
            <div><dt>Route Group</dt><dd>{plugin.routeGroup?.id ?? "none"}</dd></div>
            <div><dt>Settings</dt><dd>{plugin.settings?.length ?? 0}</dd></div>
          </dl>
        </Card.Content>
      </Card>

      <CollapsibleInspectorCard
        cardId="routes"
        isExpanded={expandedCards.has("routes")}
        onToggle={toggleInspectorCard}
        title="Routes"
      >
        <Card.Content className="plugin-inspector-list">
          {routes.length ? routes.map((route) => <RouteRow key={route.id} route={route} />) : <p>No backend routes registered.</p>}
        </Card.Content>
      </CollapsibleInspectorCard>

      <CollapsibleInspectorCard
        cardId="permissions"
        isExpanded={expandedCards.has("permissions")}
        onToggle={toggleInspectorCard}
        title="Permissions"
      >
        <Card.Content className="plugin-inspector-list">
          {(plugin.permissions.length ? plugin.permissions : ["public"]).map((permission) => (
            <div key={permission}><span>{permission}</span><strong>{permission === "public" ? "OPEN" : "REQUIRED"}</strong></div>
          ))}
        </Card.Content>
      </CollapsibleInspectorCard>

      <CollapsibleInspectorCard
        cardId="manifest"
        isExpanded={expandedCards.has("manifest")}
        onToggle={toggleInspectorCard}
        title="Manifest JSON"
      >
        <Card.Content>
          <pre>{JSON.stringify(plugin, null, 2)}</pre>
        </Card.Content>
      </CollapsibleInspectorCard>
    </aside>
  );
}

type CollapsibleInspectorCardProps = {
  cardId: string;
  children: ReactNode;
  isExpanded: boolean;
  onToggle: (cardId: string) => void;
  title: string;
};

function CollapsibleInspectorCard({ cardId, children, isExpanded, onToggle, title }: CollapsibleInspectorCardProps) {
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    onToggle(cardId);
  }

  return (
    <Card
      aria-expanded={isExpanded}
      aria-label={`${title} details`}
      className="plugin-inspector-collapsible-card"
      data-expanded={isExpanded ? "true" : "false"}
      onClick={() => onToggle(cardId)}
      onKeyDown={onKeyDown}
      role="button"
      tabIndex={0}
    >
      <Card.Header><Card.Title>{title}</Card.Title></Card.Header>
      {children}
      <span aria-hidden="true" className="plugin-inspector-collapse-cue">
        <PixelIcon name="expand-down" variant="bare" />
      </span>
    </Card>
  );
}

function RouteRow({ route }: { route: BackendRouteDefinition }) {
  return (
    <div>
      <span>{route.method} {route.path}</span>
      <strong>{route.auth}</strong>
    </div>
  );
}

function PluginLoadingState() {
  return (
    <Card aria-busy="true" className="plugin-state-card">
      <Card.Content>
        <SkeletonStack rowHeight={58} rows={4} widths={["100%", "94%", "88%", "76%"]} />
      </Card.Content>
    </Card>
  );
}

function PluginEmptyState() {
  return (
    <Card className="plugin-state-card">
      <Card.Content>No plugins are registered by the backend.</Card.Content>
    </Card>
  );
}
