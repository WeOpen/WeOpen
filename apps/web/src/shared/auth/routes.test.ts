import assert from "node:assert/strict";
import test from "node:test";
import { buildLoginPath, isPublicWebPath, safeNextPath } from "./routes.ts";

test("safeNextPath keeps relative application paths with query strings", () => {
  assert.equal(safeNextPath("/settings?tab=secrets"), "/settings?tab=secrets");
});

test("safeNextPath rejects external or protocol-relative targets", () => {
  assert.equal(safeNextPath("https://evil.example/dashboard"), "/dashboard");
  assert.equal(safeNextPath("//evil.example/dashboard"), "/dashboard");
});

test("safeNextPath avoids login redirect loops", () => {
  assert.equal(safeNextPath("/login?next=/settings"), "/dashboard");
});

test("buildLoginPath preserves the original protected route", () => {
  assert.equal(buildLoginPath("/settings", "?tab=secrets"), "/login?next=%2Fsettings%3Ftab%3Dsecrets");
});

test("isPublicWebPath lets auth and static assets through", () => {
  assert.equal(isPublicWebPath("/"), true);
  assert.equal(isPublicWebPath("/login"), true);
  assert.equal(isPublicWebPath("/api/auth/login"), true);
  assert.equal(isPublicWebPath("/api/plugins/blog/posts"), true);
  assert.equal(isPublicWebPath("/api"), false);
  assert.equal(isPublicWebPath("/_next/static/chunk.js"), true);
  assert.equal(isPublicWebPath("/favicon.svg"), true);
  assert.equal(isPublicWebPath("/dashboard"), false);
});
