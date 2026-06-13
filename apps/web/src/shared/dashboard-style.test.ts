import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const globalsCss = readFileSync(
  fileURLToPath(new URL("../../app/globals.css", import.meta.url)),
  "utf8"
);
const dashboardPage = readFileSync(
  fileURLToPath(new URL("../../app/dashboard/page.tsx", import.meta.url)),
  "utf8"
);
const pluginsPage = readFileSync(
  fileURLToPath(new URL("../../app/plugins/page.tsx", import.meta.url)),
  "utf8"
);

describe("dashboard table scroll styling", () => {
  test("keeps the dashboard module table horizontally scrollable", () => {
    assert.match(
      globalsCss,
      /\.dashboard-module-table \.table__scroll-container,\s*\.dashboard-module-table\.weopen-horizontal-scroll-viewport\s*{[^}]*overflow-x: auto;[^}]*overflow-y: hidden;/s
    );
  });

  test("dashboard and plugin pages use generated pixel icons instead of glyph helpers", () => {
    assert.match(dashboardPage, /PixelIcon/);
    assert.doesNotMatch(dashboardPage, /function iconForName/);
    assert.match(pluginsPage, /PixelIcon/);
    assert.doesNotMatch(pluginsPage, /function iconForPlugin/);
  });
});
