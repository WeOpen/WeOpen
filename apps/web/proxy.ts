import { NextResponse, type NextRequest } from "next/server";
import { buildLoginPath, isPublicWebPath, safeNextPath } from "./src/shared/auth/routes";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";
const SESSION_COOKIE = "weopen_session";

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (isPublicWebPath(pathname)) {
    if (pathname === "/login" && token && (await hasActiveSession(token))) {
      const nextPath = safeNextPath(request.nextUrl.searchParams.get("next"));
      return NextResponse.redirect(new URL(nextPath, request.url));
    }
    return NextResponse.next();
  }

  if (!token || !(await hasActiveSession(token))) {
    const response = NextResponse.redirect(new URL(buildLoginPath(pathname, search), request.url));
    response.cookies.delete(SESSION_COOKIE);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|favicon.svg|robots.txt|sitemap.xml).*)"]
};

async function hasActiveSession(token: string): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store"
    });
    return response.ok;
  } catch {
    return false;
  }
}
