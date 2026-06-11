const PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
const CSRF_HEADER = "X-CSRF-Token";

let csrfTokenCache: string | null = null;

/** apiBaseUrl is intentionally empty by default so browser calls use the Web app's same-origin API proxy. */
export function apiBaseUrl(): string {
  return trimTrailingSlash(PUBLIC_API_BASE_URL.trim());
}

/** apiUrl joins a normalized API path to the optional public API base URL. */
export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${apiBaseUrl()}${normalizedPath}`;
}

export type ApiErrorBody = {
  error?: {
    code?: string;
    message?: string;
    requestId?: string;
  };
};

export class ApiError extends Error {
  code?: string;
  requestId?: string;
  status: number;

  constructor(message: string, status: number, code?: string, requestId?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.requestId = requestId;
  }
}

/** apiFetch centralizes credentialed browser API calls and CSRF protection for unsafe methods. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);

  if (isUnsafeMethod(method) && !headers.has(CSRF_HEADER)) {
    const token = await csrfToken();
    if (token) {
      headers.set(CSRF_HEADER, token);
    }
  }

  return fetch(apiUrl(path), {
    ...init,
    method,
    headers,
    credentials: init.credentials ?? "include",
    cache: init.cache ?? "no-store"
  });
}

/** ensureApiResponse throws a status-aware error while preserving backend messages. */
export async function ensureApiResponse(response: Response, fallback: string): Promise<void> {
  if (response.ok) {
    return;
  }
  throw await apiErrorFromResponse(response, fallback);
}

export async function apiErrorFromResponse(response: Response, fallback: string): Promise<ApiError> {
  try {
    const body = (await response.json()) as ApiErrorBody;
    return new ApiError(body.error?.message || fallback, response.status, body.error?.code, body.error?.requestId);
  } catch {
    return new ApiError(fallback, response.status);
  }
}

export function clearCSRFToken(): void {
  csrfTokenCache = null;
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function isUnsafeMethod(method: string): boolean {
  return method === "POST" || method === "PATCH" || method === "PUT" || method === "DELETE";
}

async function csrfToken(): Promise<string | null> {
  if (csrfTokenCache) {
    return csrfTokenCache;
  }
  const response = await fetch(apiUrl("/api/auth/csrf"), {
    credentials: "include",
    cache: "no-store",
    headers: { Accept: "application/json" }
  });
  if (!response.ok) {
    return null;
  }
  const body = (await response.json()) as { token?: string };
  csrfTokenCache = body.token ?? null;
  return csrfTokenCache;
}
