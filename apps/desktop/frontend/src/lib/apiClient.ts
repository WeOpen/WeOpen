import {
  createAPIClient,
  normalizeApiBaseUrl,
  type DashboardSummary,
  type FetchLike
} from "@weopen/sdk/client";

const storageKey = "weopen.desktop.remoteApiSettings.v1";

export type RemoteApiSettings = {
  baseUrl: string;
  sessionToken: string;
  updatedAt?: string;
};

export type RemoteApiConnectionStatus = {
  ok: boolean;
  status?: string;
  service?: string;
  version?: string;
  error?: string;
  checkedAt: string;
};

const emptySettings: RemoteApiSettings = {
  baseUrl: "",
  sessionToken: ""
};

export function loadRemoteApiSettings(storage = getBrowserStorage()): RemoteApiSettings {
  if (!storage) {
    return { ...emptySettings };
  }

  const raw = storage.getItem(storageKey);
  if (!raw) {
    return { ...emptySettings };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<RemoteApiSettings>;
    return {
      baseUrl: typeof parsed.baseUrl === "string" ? parsed.baseUrl : "",
      sessionToken: typeof parsed.sessionToken === "string" ? parsed.sessionToken : "",
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : undefined
    };
  } catch {
    return { ...emptySettings };
  }
}

export function saveRemoteApiSettings(
  input: RemoteApiSettings,
  storage = getBrowserStorage()
): RemoteApiSettings {
  const saved: RemoteApiSettings = {
    baseUrl: normalizeApiBaseUrl(input.baseUrl),
    sessionToken: input.sessionToken.trim(),
    updatedAt: new Date().toISOString()
  };

  storage?.setItem(storageKey, JSON.stringify(saved));
  return saved;
}

export function createRemoteAPIClient(settings: RemoteApiSettings, fetcher?: FetchLike) {
  return createAPIClient({
    baseUrl: settings.baseUrl,
    fetcher,
    sessionToken: settings.sessionToken
  });
}

export async function testRemoteAPIConnection(
  settings: RemoteApiSettings,
  fetcher?: FetchLike
): Promise<RemoteApiConnectionStatus> {
  const checkedAt = new Date().toISOString();
  try {
    const normalized = {
      ...settings,
      baseUrl: normalizeApiBaseUrl(settings.baseUrl)
    };
    if (!normalized.baseUrl) {
      return {
        checkedAt,
        error: "请先配置远程 API 地址。",
        ok: false
      };
    }

    const health = await createRemoteAPIClient(normalized, fetcher).health();
    return {
      checkedAt,
      ok: health.status === "ok",
      service: health.service,
      status: health.status,
      version: health.version
    };
  } catch (error) {
    return {
      checkedAt,
      error: error instanceof Error ? error.message : String(error),
      ok: false
    };
  }
}

export async function loadDashboardSummary(
  settings: RemoteApiSettings,
  fetcher?: FetchLike
): Promise<DashboardSummary> {
  return createRemoteAPIClient(settings, fetcher).dashboardSummary();
}

function getBrowserStorage(): Storage | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  return window.localStorage;
}
