import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const adminCss = readFileSync(fileURLToPath(new URL("./admin.css", import.meta.url)), "utf8");
const publicApi = readFileSync(fileURLToPath(new URL("./index.ts", import.meta.url)), "utf8");

describe("thesvg theme migration", () => {
  test("ships the thesvg light theme as the default token set", () => {
    assert.match(adminCss, /:root\s*{[\s\S]*color-scheme:\s*light;/);
    assert.match(adminCss, /--background:\s*oklch\(0\.985 0 0\);/);
    assert.match(adminCss, /--foreground:\s*oklch\(0\.145 0 0\);/);
    assert.match(adminCss, /--card:\s*oklch\(1 0 0\);/);
    assert.match(adminCss, /--border:\s*oklch\(0\.91 0 0\);/);
  });

  test("keeps thesvg dark tokens available behind class and data-theme selectors", () => {
    assert.match(adminCss, /\.dark,\s*\[data-theme="dark"\]\s*{/);
    assert.match(adminCss, /--background:\s*oklch\(0\.1 0 0\);/);
    assert.match(adminCss, /--foreground:\s*oklch\(0\.93 0 0\);/);
    assert.match(adminCss, /--border:\s*oklch\(1 0 0 \/ 8%\);/);
  });

  test("exports thesvg-style shared primitives from the UI package", () => {
    for (const symbol of ["Badge", "Button", "Card", "Input", "Separator", "Textarea", "ThemeToggle"]) {
      assert.match(publicApi, new RegExp(`export \\{ ${symbol} \\}`));
    }
  });
});
