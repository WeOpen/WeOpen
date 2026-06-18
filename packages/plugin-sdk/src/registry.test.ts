import assert from "node:assert/strict";
import test from "node:test";
import { DuplicatePluginError, PluginRegistry, PluginNotFoundError, createPluginRegistry } from "./registry.ts";
import { definePluginManifest } from "./manifest.ts";
import type { PluginManifest } from "./manifest.ts";

function manifest(id: string, order = 0): PluginManifest {
  return definePluginManifest({
    id,
    name: id,
    version: "0.1.0",
    permissions: [],
    nav: [{ title: id, path: `/${id}`, icon: "square", order }]
  });
}

test("registry rejects duplicate plugin IDs", () => {
  const registry = new PluginRegistry();
  registry.register({ manifest: manifest("blog") });

  assert.throws(
    () => registry.register({ manifest: manifest("blog") }),
    DuplicatePluginError
  );
});

test("registry returns enabled navigation in display order", () => {
  const registry = new PluginRegistry();
  registry.register({ manifest: manifest("storage-r2", 20) });
  registry.register({ manifest: manifest("blog", 10) });
  registry.setEnabled("storage-r2", false);

  assert.deepEqual(registry.navigation().map((item) => item.title), ["blog"]);
});

test("registry throws when enabling an unknown plugin", () => {
  const registry = new PluginRegistry();

  assert.throws(() => registry.setEnabled("missing", true), PluginNotFoundError);
});

test("createPluginRegistry registers compile-time plugin definitions", () => {
  const registry = createPluginRegistry([
    { manifest: manifest("blog", 20), component: "BlogPage" },
    { manifest: manifest("tools", 10), component: "ToolsPage", enabled: false }
  ]);

  assert.deepEqual(registry.all().map((plugin) => plugin.manifest.id), ["blog", "tools"]);
  assert.deepEqual(registry.navigation().map((item) => item.title), ["blog"]);
});
