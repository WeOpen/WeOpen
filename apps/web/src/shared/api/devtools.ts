import type { DeveloperTool, DeveloperToolPanel } from "@/plugins/devtools/types";
import { apiFetch, ensureApiResponse } from "./base";

export type DeveloperToolsCatalog = {
  tools: DeveloperTool[];
  panels: DeveloperToolPanel[];
};

type DeveloperToolsCatalogPayload = {
  tools?: DeveloperTool[];
  panels?: DeveloperToolPanel[];
};

export async function listDeveloperTools(): Promise<DeveloperToolsCatalog> {
  const response = await apiFetch("/api/plugins/devtools/tools", {
    headers: { Accept: "application/json" }
  });
  await ensureApiResponse(response, "Failed to read developer tools catalog.");
  const body = (await response.json()) as DeveloperToolsCatalogPayload;
  return {
    tools: Array.isArray(body.tools) ? body.tools : [],
    panels: Array.isArray(body.panels) ? body.panels : []
  };
}
