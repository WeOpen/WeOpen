import { apiFetch, ensureApiResponse } from "./base";

export const PLUGIN_REGISTRY_CHANGED_EVENT = "weopen:plugin-registry-changed";

export type BackendPlugin = {
  id: string;
  name: string;
  description: string;
  version: string;
  permissions: string[];
  settings?: Array<{ key: string; label: string; type: string; required?: boolean; description?: string }>;
  navigation?: Array<{ title: string; path: string; icon?: string; order?: number }>;
  routeGroup?: BackendRouteGroup;
  routeCount: number;
  routePrefix?: string;
  enabled: boolean;
};

export type BackendRouteGroup = {
  id: string;
  title: string;
  description?: string;
  routes: BackendRouteDefinition[];
};

export type BackendRouteDefinition = {
  id: string;
  method: string;
  path: string;
  summary: string;
  auth: string;
  permissions?: string[];
};

type PluginsResponse = {
  plugins: BackendPluginPayload[];
};

type BackendPluginPayload = Omit<BackendPlugin, "routeCount"> & {
  routeCount?: number;
};

const builtinPluginPresentation: Record<string, { name: string; description: string; icon: string; title: string }> = {
  blog: {
    name: "Blog",
    description: "Manage Markdown posts, drafts, tags, and publishing state.",
    icon: "blog",
    title: "Blog"
  },
  devtools: {
    name: "Developer Tools",
    description: "Local-first JSON, encoding, time, UUID, JWT, hash, HMAC, and regex utilities.",
    icon: "tools",
    title: "Tools"
  },
  domains: {
    name: "Domains",
    description: "Read-only Cloudflare domain, DNS, and certificate risk monitoring; DNS writes are disabled in v1.",
    icon: "domains",
    title: "Domains"
  },
  "storage-r2": {
    name: "Storage R2",
    description: "Manage R2 objects, blog media, and backup files.",
    icon: "storage",
    title: "Storage R2"
  }
};

export async function listPlugins(): Promise<BackendPlugin[]> {
  const response = await apiFetch("/api/plugins", {
    headers: { Accept: "application/json" }
  });
  await ensureApiResponse(response, "Failed to read plugin registry.");
  const body = (await response.json()) as PluginsResponse;
  return normalizePlugins(body.plugins);
}

export async function setPluginEnabled(pluginId: string, enabled: boolean): Promise<BackendPlugin[]> {
  const response = await apiFetch(`/api/plugins/${encodeURIComponent(pluginId)}`, {
    method: "PATCH",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ enabled })
  });
  await ensureApiResponse(response, "Failed to save plugin state.");
  const body = (await response.json()) as PluginsResponse;
  const plugins = normalizePlugins(body.plugins);
  notifyPluginRegistryChanged(plugins);
  return plugins;
}

function normalizePlugins(plugins: BackendPluginPayload[] = []): BackendPlugin[] {
  return plugins.map((plugin) => {
    const presentation = builtinPluginPresentation[plugin.id];
    return {
      ...plugin,
      name: presentation?.name ?? plugin.name,
      description: presentation?.description ?? plugin.description,
      permissions: plugin.permissions ?? [],
      settings: plugin.settings ?? [],
      navigation: normalizeNavigation(plugin, presentation),
      routeCount: plugin.routeCount ?? plugin.routeGroup?.routes.length ?? 0
    };
  });
}

function normalizeNavigation(
  plugin: BackendPluginPayload,
  presentation?: { icon: string; title: string }
): BackendPlugin["navigation"] {
  const navigation = plugin.navigation ?? [];
  if (!presentation) {
    return navigation;
  }
  return navigation.map((item) => ({
    ...item,
    icon: presentation.icon,
    title: presentation.title
  }));
}

function notifyPluginRegistryChanged(plugins: BackendPlugin[]): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new CustomEvent<BackendPlugin[]>(PLUGIN_REGISTRY_CHANGED_EVENT, { detail: plugins }));
}
