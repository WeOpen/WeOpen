import { NextResponse, type NextRequest } from "next/server";
import { backendApiUrl } from "@/shared/api/server-base";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

const RESPONSE_HEADER_BLOCKLIST = new Set([
  "connection",
  "content-encoding",
  "content-length",
  "keep-alive",
  "set-cookie",
  "transfer-encoding",
  "upgrade"
]);

const REQUEST_HEADER_BLOCKLIST = new Set([
  "connection",
  "content-length",
  "host",
  "keep-alive",
  "transfer-encoding",
  "upgrade"
]);

export async function GET(request: NextRequest, context: RouteContext) {
  return proxyToBackend(request, context);
}

export async function POST(request: NextRequest, context: RouteContext) {
  return proxyToBackend(request, context);
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  return proxyToBackend(request, context);
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  return proxyToBackend(request, context);
}

export async function OPTIONS(request: NextRequest, context: RouteContext) {
  return proxyToBackend(request, context);
}

async function proxyToBackend(request: NextRequest, context: RouteContext): Promise<NextResponse> {
  const segments = (await context.params).path ?? [];
  const backendPath = backendPathFor(segments);
  const target = new URL(backendApiUrl(backendPath));
  target.search = request.nextUrl.search;

  const backendResponse = await fetch(target, {
    method: request.method,
    headers: requestHeaders(request.headers),
    body: shouldForwardBody(request.method) ? await request.arrayBuffer() : undefined,
    cache: "no-store",
    redirect: "manual"
  });

  if (isLoginRoute(segments) && isJSONResponse(backendResponse)) {
    const payload = (await backendResponse.json()) as Record<string, unknown>;
    delete payload.token;
    const response = NextResponse.json(payload, {
      status: backendResponse.status,
      headers: responseHeaders(backendResponse.headers)
    });
    appendSetCookie(response, backendResponse.headers);
    return response;
  }

  const body = backendResponse.status === 204 ? null : await backendResponse.arrayBuffer();
  const response = new NextResponse(body, {
    status: backendResponse.status,
    headers: responseHeaders(backendResponse.headers)
  });
  appendSetCookie(response, backendResponse.headers);
  return response;
}

function backendPathFor(segments: string[]): string {
  if (segments.length === 1 && segments[0] === "healthz") {
    return "/healthz";
  }
  return `/api/${segments.map((segment) => encodeURIComponent(segment)).join("/")}`;
}

function requestHeaders(headers: Headers): Headers {
  const nextHeaders = new Headers();
  for (const [name, value] of headers.entries()) {
    if (!REQUEST_HEADER_BLOCKLIST.has(name.toLowerCase())) {
      nextHeaders.set(name, value);
    }
  }
  return nextHeaders;
}

function responseHeaders(headers: Headers): Headers {
  const nextHeaders = new Headers();
  for (const [name, value] of headers.entries()) {
    if (!RESPONSE_HEADER_BLOCKLIST.has(name.toLowerCase())) {
      nextHeaders.set(name, value);
    }
  }
  return nextHeaders;
}

function appendSetCookie(response: NextResponse, headers: Headers) {
  const maybeMultiCookieHeaders = headers as Headers & { getSetCookie?: () => string[] };
  const setCookies = maybeMultiCookieHeaders.getSetCookie?.() ?? cookieHeaderFallback(headers);
  for (const cookie of setCookies) {
    response.headers.append("Set-Cookie", cookie);
  }
}

function cookieHeaderFallback(headers: Headers): string[] {
  const cookie = headers.get("set-cookie");
  return cookie ? [cookie] : [];
}

function shouldForwardBody(method: string): boolean {
  return method !== "GET" && method !== "HEAD";
}

function isLoginRoute(segments: string[]): boolean {
  return segments.length === 2 && segments[0] === "auth" && segments[1] === "login";
}

function isJSONResponse(response: Response): boolean {
  return response.headers.get("content-type")?.includes("application/json") ?? false;
}
