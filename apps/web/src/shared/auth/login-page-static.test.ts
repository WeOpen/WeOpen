import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { fileURLToPath } from "node:url";

const loginPage = readFileSync(
  fileURLToPath(new URL("../../../app/login/page.tsx", import.meta.url)),
  "utf8"
);
const loginForm = readFileSync(
  fileURLToPath(new URL("../../features/auth/login-form.tsx", import.meta.url)),
  "utf8"
);
const loginApiProxy = readFileSync(
  fileURLToPath(new URL("../../../app/api/[...path]/route.ts", import.meta.url)),
  "utf8"
);
const authApi = readFileSync(
  fileURLToPath(new URL("../api/auth.ts", import.meta.url)),
  "utf8"
);

test("login page does not render fixed mock system status or default credentials", () => {
  assert.doesNotMatch(loginPage, /2025-05-20/);
  assert.doesNotMatch(loginPage, /Default dev credentials/);
  assert.doesNotMatch(loginPage, /admin@example\.com\s*\/\s*admin/);
  assert.doesNotMatch(loginPage, /No active session/);
  assert.doesNotMatch(loginPage, /<dd>Production<\/dd>/);
  assert.doesNotMatch(loginPage, /<dd>Global<\/dd>/);
  assert.match(loginPage, /loadLoginSystemStatus/);
});

test("login form starts empty instead of pre-filling the local admin account", () => {
  assert.doesNotMatch(loginForm, /useState\("admin@example\.com"\)/);
  assert.match(loginForm, /useState\(""\)/);
  assert.match(loginForm, /required/);
});

test("login reports backend connectivity separately from invalid credentials", () => {
  assert.match(loginApiProxy, /BACKEND_UNAVAILABLE/);
  assert.match(loginApiProxy, /后台服务未连接，请先启动 API 服务后重试/);
  assert.match(authApi, /登录服务暂时不可用，请稍后重试/);
});
