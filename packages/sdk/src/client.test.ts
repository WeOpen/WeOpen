import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createAPIClient, normalizeApiBaseUrl } from "./client.ts";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json" },
    status
  });
}

describe("shared WeOpen API client", () => {
  test("normalizes HTTP API base URLs and rejects unsupported schemes", () => {
    assert.equal(normalizeApiBaseUrl(" https://api.weopen.local/ "), "https://api.weopen.local");
    assert.equal(normalizeApiBaseUrl(""), "");
    assert.throws(() => normalizeApiBaseUrl("ftp://api.weopen.local"), /http or https/);
  });

  test("probes /healthz with bearer token", async () => {
    const requests: Request[] = [];
    const client = createAPIClient({
      baseUrl: "https://api.weopen.local/",
      fetcher: async (input, init) => {
        const request = input instanceof Request ? input : new Request(input, init);
        requests.push(request);
        return jsonResponse({ status: "ok", service: "weopen-api", version: "0.1.0" });
      },
      sessionToken: "session-token"
    });

    const health = await client.health();

    assert.deepEqual(health, { status: "ok", service: "weopen-api", version: "0.1.0" });
    assert.equal(requests[0]?.url, "https://api.weopen.local/healthz");
    assert.equal(requests[0]?.headers.get("Authorization"), "Bearer session-token");
  });

  test("returns an unconfigured dashboard summary without calling fetch", async () => {
    let calls = 0;
    const client = createAPIClient({
      fetcher: async () => {
        calls += 1;
        return jsonResponse({});
      }
    });

    const summary = await client.dashboardSummary();

    assert.equal(calls, 0);
    assert.equal(summary.status, "unconfigured");
    assert.deepEqual(summary.plugins, []);
  });

  test("combines health and plugin list for dashboard summaries", async () => {
    const client = createAPIClient({
      baseUrl: "https://api.weopen.local",
      fetcher: async (input, init) => {
        const request = input instanceof Request ? input : new Request(input, init);
        if (request.url.endsWith("/healthz")) {
          return jsonResponse({ status: "ok", service: "weopen-api", version: "0.1.0" });
        }
        if (request.url.endsWith("/api/plugins")) {
          return jsonResponse({
            plugins: [
              {
                description: "Blog workspace",
                enabled: true,
                id: "blog",
                name: "Blog",
                permissions: [],
                version: "0.1.0"
              }
            ]
          });
        }
        throw new Error(`unexpected URL ${request.url}`);
      },
      sessionToken: "session-token"
    });

    const summary = await client.dashboardSummary();

    assert.equal(summary.status, "online");
    assert.equal(summary.health?.service, "weopen-api");
    assert.equal(summary.plugins.length, 1);
    assert.equal(summary.plugins[0]?.enabled, true);
  });

  test("reports offline dashboard summaries when the remote API is unreachable", async () => {
    const client = createAPIClient({
      baseUrl: "https://api.weopen.local",
      fetcher: async () => {
        throw new Error("network unavailable");
      }
    });

    const summary = await client.dashboardSummary();

    assert.equal(summary.status, "offline");
    assert.match(summary.error ?? "", /network unavailable/);
  });
});
