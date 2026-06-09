const DEFAULT_BACKEND_API_BASE_URL = "http://localhost:8080";

/** backendApiBaseUrl is server-only and points Next route handlers/proxy checks at the Go API. */
export function backendApiBaseUrl(): string {
  return trimTrailingSlash(
    firstNonEmpty([
      process.env.WEOPEN_API_BASE_URL,
      process.env.API_INTERNAL_BASE_URL,
      process.env.NEXT_PUBLIC_API_BASE_URL,
      DEFAULT_BACKEND_API_BASE_URL
    ])
  );
}

/** backendApiUrl joins a backend path to the configured Go API origin. */
export function backendApiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${backendApiBaseUrl()}${normalizedPath}`;
}

function firstNonEmpty(values: Array<string | undefined>): string {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed) {
      return trimmed;
    }
  }
  return DEFAULT_BACKEND_API_BASE_URL;
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
