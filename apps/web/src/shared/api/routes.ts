import { apiFetch, ensureApiResponse } from "./base";

export type ApiRouteParameter = {
  name: string;
  in: "path" | "query" | "body" | "header" | string;
  required: boolean;
  description: string;
  example?: unknown;
};

export type ApiRouteDefinition = {
  id: string;
  method: string;
  path: string;
  summary: string;
  auth: string;
  permissions?: string[];
  parameters?: ApiRouteParameter[];
  requestExample?: unknown;
  responseExample?: unknown;
};

export type ApiRouteGroup = {
  id: string;
  title: string;
  description?: string;
  routes: ApiRouteDefinition[];
};

export type ApiRouteCatalog = {
  groups: ApiRouteGroup[];
};

export async function getRouteCatalog(): Promise<ApiRouteCatalog> {
  const response = await apiFetch(`/api/routes?refresh=${Date.now()}`, {
    headers: { Accept: "application/json" }
  });
  await ensureApiResponse(response, "接口目录读取失败");
  const body = (await response.json()) as ApiRouteCatalog;
  return {
    groups: Array.isArray(body.groups) ? body.groups : []
  };
}
