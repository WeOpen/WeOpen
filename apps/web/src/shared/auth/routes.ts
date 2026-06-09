const DEFAULT_AUTH_REDIRECT = "/dashboard";
const PUBLIC_FILE_PATTERN = /\.[^/]+$/;

/** safeNextPath keeps post-login redirects inside this app and avoids login loops. */
export function safeNextPath(value: string | null | undefined, fallback = DEFAULT_AUTH_REDIRECT): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return fallback;
  }

  try {
    const url = new URL(value, "https://weopen.local");
    if (url.origin !== "https://weopen.local" || isLoginPath(url.pathname)) {
      return fallback;
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}

/** buildLoginPath preserves the route the user wanted before auth redirected them. */
export function buildLoginPath(pathname: string, search = ""): string {
  const nextPath = safeNextPath(`${pathname}${search}`);
  return `/login?next=${encodeURIComponent(nextPath)}`;
}

/** isPublicWebPath returns true for routes that must not require an active API session. */
export function isPublicWebPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    isLoginPath(pathname) ||
    pathname.startsWith("/_next/") ||
    pathname === "/favicon.ico" ||
    pathname === "/favicon.svg" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    PUBLIC_FILE_PATTERN.test(pathname)
  );
}

function isLoginPath(pathname: string): boolean {
  return pathname === "/login" || pathname.startsWith("/login/");
}
