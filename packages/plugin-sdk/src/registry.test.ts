import assert from "node:assert/strict";
import test from "node:test";
import { DuplicatePluginError, PluginRegistry, PluginNotFoundError } from "./registry.ts";
import type { PluginManifest } from "./manifest.ts";

function manifest(id: string, order = 0): PluginManifest {
  return {
    id,
    name: id,
    version: "0.1.0",
    permissions: [],
    nav: [{ title: id, path: `/${id}`, icon: "square", order }]
  };
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
