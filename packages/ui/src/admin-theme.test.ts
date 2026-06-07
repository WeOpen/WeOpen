import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const stylesCss = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
const publicApi = readFileSync(fileURLToPath(new URL("./index.ts", import.meta.url)), "utf8");

describe("custom Nothing admin theme", () => {
  test("removes external UI-kit styling and declares Nothing tokens", () => {
    assert.doesNotMatch(stylesCss, new RegExp("@hero" + "ui/"));
    assert.match(stylesCss, /--black: #000000/);
    assert.match(stylesCss, /--accent: #d71921/);
    assert.match(stylesCss, /Space Grotesk/);
    assert.match(stylesCss, /Space Mono/);
    assert.match(stylesCss, /Doto/);
    assert.match(stylesCss, /scrollbar-width: none/);
    assert.match(stylesCss, /::-webkit-scrollbar/);
    assert.match(stylesCss, /display: none/);
    assert.match(stylesCss, /weopen-scroll-rail/);
    assert.match(stylesCss, /weopen-horizontal-scroll-rail/);
    assert.match(stylesCss, /weopen-horizontal-scroll-thumb/);
    assert.match(stylesCss, /radial-gradient/);
    assert.match(stylesCss, /html,\s*body\s*{[^}]*overflow: hidden/s);
    assert.match(stylesCss, /\.weopen-admin-shell\s*{[^}]*height: 100dvh[^}]*overflow: hidden/s);
    assert.match(stylesCss, /\.weopen-admin-main\s*{[^}]*height: 100dvh[^}]*overflow-y: auto/s);
  });

  test("exports custom shared primitives from the UI package", () => {
    for (const symbol of [
      "Alert",
      "Badge",
      "Button",
      "Card",
      "Chip",
      "ConfirmActionDialog",
      "DataTable",
      "EmptyState",
      "FileDropzone",
      "HorizontalScrollArea",
      "Input",
      "MetricCard",
      "PageHeader",
      "Separator",
      "StatusChip",
      "Tabs",
      "Textarea",
      "ThemeToggle",
      "AdminShell"
    ]) {
      assert.match(publicApi, new RegExp(`export \\{ ${symbol} \\}`));
    }
  });
});
