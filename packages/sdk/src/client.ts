export type FetchLike = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export type APIClientConfig = {
  baseUrl?: string;
  fetcher?: FetchLike;
  sessionToken?: string;
};

export type HealthResponse = {
  status: string;
  service: string;
  version?: string;
};

export type PluginSummary = {
  id: string;
  name: string;
  description: string;
  version: string;
  permissions: string[];
  enabled: boolean;
};

export type DashboardSummary = {
  status: "unconfigured" | "online" | "offline";
  health?: HealthResponse;
  plugins: PluginSummary[];
  error?: string;
};

export type APIClient = {
  baseUrl: string;
  dashboardSummary(): Promise<DashboardSummary>;
  health(): Promise<HealthResponse>;
  listPlugins(): Promise<PluginSummary[]>;
};

type PluginListPayload = {
  plugins?: unknown;
};

export function normalizeApiBaseUrl(input = ""): string {
  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch (error) {
    throw new Error(error instanceof Error ? error.message : "API base URL is invalid");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("API base URL must use http or https");
  }
  parsed.search = "";
  parsed.hash = "";
  return parsed.href.replace(/\/+$/, "");
}

export function createAPIClient(config: APIClientConfig = {}): APIClient {
  const baseUrl = normalizeApiBaseUrl(config.baseUrl);
  const sessionToken = config.sessionToken?.trim() ?? "";
  const fetcher = config.fetcher ?? globalThis.fetch?.bind(globalThis);

  async function requestJSON<T>(path: string): Promise<T> {
    if (!baseUrl) {
      throw new Error("API base URL is not configured");
    }
    if (!fetcher) {
      throw new Error("fetch is not available in this runtime");
    }

    const headers = new Headers({ Accept: "application/json" });
    if (sessionToken) {
      headers.set("Authorization", `Bearer ${sessionToken}`);
    }

    const response = await fetcher(`${baseUrl}${path}`, {
      credentials: "include",
      headers,
      method: "GET"
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ""}`);
    }

    const text = await response.text();
    return (text ? JSON.parse(text) : {}) as T;
  }

  return {
    baseUrl,
    async dashboardSummary() {
      if (!baseUrl) {
        return { plugins: [], status: "unconfigured" };
      }

      try {
        const health = await this.health();
        try {
          const plugins = await this.listPlugins();
          return {
            health,
            plugins,
            status: health.status === "ok" ? "online" : "offline"
          };
        } catch (error) {
          return {
            error: `Plugin list unavailable: ${messageFromError(error)}`,
            health,
            plugins: [],
            status: health.status === "ok" ? "online" : "offline"
          };
        }
      } catch (error) {
        return {
          error: messageFromError(error),
          plugins: [],
          status: "offline"
        };
      }
    },
    async health() {
      const payload = await requestJSON<Partial<HealthResponse>>("/healthz");
      return {
        service: stringOr(payload.service, "unknown"),
        status: stringOr(payload.status, "unknown"),
        version: typeof payload.version === "string" ? payload.version : undefined
      };
    },
    async listPlugins() {
      const payload = await requestJSON<PluginListPayload>("/api/plugins");
      if (!Array.isArray(payload.plugins)) {
        return [];
      }
      return payload.plugins.map(pluginFromPayload).filter((plugin): plugin is PluginSummary => plugin !== undefined);
    }
  };
}

function pluginFromPayload(input: unknown): PluginSummary | undefined {
  if (!input || typeof input !== "object") {
    return undefined;
  }
  const payload = input as Record<string, unknown>;
  const id = stringOr(payload.id);
  if (!id) {
    return undefined;
  }

  return {
    description: stringOr(payload.description),
    enabled: Boolean(payload.enabled),
    id,
    name: stringOr(payload.name, id),
    permissions: Array.isArray(payload.permissions)
      ? payload.permissions.filter((permission): permission is string => typeof permission === "string")
      : [],
    version: stringOr(payload.version)
  };
}

function stringOr(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function messageFromError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
