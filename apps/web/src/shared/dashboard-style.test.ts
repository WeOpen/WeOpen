import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const globalsCss = readFileSync(
  fileURLToPath(new URL("../../app/globals.css", import.meta.url)),
  "utf8"
);

describe("dashboard table scroll styling", () => {
  test("keeps the dashboard module table horizontally scrollable", () => {
    assert.match(
      globalsCss,
      /\.dashboard-module-table\.weopen-horizontal-scroll-viewport\s*{[^}]*overflow-x: auto;[^}]*overflow-y: hidden;/s
    );
  });
});
