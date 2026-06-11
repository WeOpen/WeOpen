import { apiFetch, ensureApiResponse } from "./base";

export type BackendPlugin = {
  id: string;
  name: string;
  description: string;
  version: string;
  permissions: string[];
  navigation?: Array<{ title: string; path: string; icon?: string; order?: number }>;
  enabled: boolean;
};

type PluginsResponse = {
  plugins: BackendPlugin[];
};

export async function listPlugins(): Promise<BackendPlugin[]> {
  const response = await apiFetch("/api/plugins", {
    headers: { Accept: "application/json" }
  });
  await ensureApiResponse(response, "插件状态读取失败");
  const body = (await response.json()) as PluginsResponse;
  return body.plugins;
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
  await ensureApiResponse(response, "插件状态保存失败");
  const body = (await response.json()) as PluginsResponse;
  return body.plugins;
}
