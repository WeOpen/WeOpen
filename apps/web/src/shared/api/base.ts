const PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";

/** apiBaseUrl is intentionally empty by default so browser calls use the Web app's same-origin API proxy. */
export function apiBaseUrl(): string {
  return trimTrailingSlash(PUBLIC_API_BASE_URL.trim());
}

/** apiUrl joins a normalized API path to the optional public API base URL. */
export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${apiBaseUrl()}${normalizedPath}`;
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
