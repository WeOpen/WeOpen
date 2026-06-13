import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import { fileURLToPath } from "node:url";

const stylesCss = readFileSync(fileURLToPath(new URL("./styles.css", import.meta.url)), "utf8");
const publicApi = readFileSync(fileURLToPath(new URL("./index.ts", import.meta.url)), "utf8");
const adminShellSource = readFileSync(fileURLToPath(new URL("./admin-shell.tsx", import.meta.url)), "utf8");
const buttonSource = readFileSync(fileURLToPath(new URL("./button.tsx", import.meta.url)), "utf8");
const pixelIconSource = readFileSync(fileURLToPath(new URL("./pixel-icon.tsx", import.meta.url)), "utf8");
const selectFieldSource = readFileSync(fileURLToPath(new URL("./select-field.tsx", import.meta.url)), "utf8");
const themeToggleSource = readFileSync(fileURLToPath(new URL("./theme-toggle.tsx", import.meta.url)), "utf8");
const toastSource = readFileSync(fileURLToPath(new URL("./toast.tsx", import.meta.url)), "utf8");
const pixelIconPatterns = readPixelIconPatterns();

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
      "AvatarStack",
      "Badge",
      "BorderBeam",
      "Button",
      "Card",
      "Checkbox",
      "Chip",
      "CommandSurface",
      "ConfirmActionDialog",
      "DataTable",
      "EmptyState",
      "FileDropzone",
      "HorizontalScrollArea",
      "Input",
      "KeyboardShortcut",
      "MarqueeRail",
      "MetricCard",
      "PageHeader",
      "PixelIcon",
      "ProgressRail",
      "Radio",
      "ScrollRail",
      "Separator",
      "SegmentedControl",
      "StatusChip",
      "Switch",
      "Tabs",
      "Textarea",
      "ThemeToggle",
      "Toast",
      "ToastViewport",
      "Tooltip",
      "AdminShell"
    ]) {
      assert.match(publicApi, new RegExp(`export \\{ ${symbol} \\}`));
    }
  });

  test("uses the shared pixel icon system for generated UI icons", () => {
    assert.match(publicApi, /export \{ PixelIcon \}/);
    assert.match(publicApi, /PixelIconVariant/);
    assert.match(stylesCss, /\.weopen-pixel-icon/);
    assert.match(stylesCss, /@keyframes weopen-pixel-icon-settle/);
    assert.match(stylesCss, /\.weopen-pixel-icon\[data-variant="bare"\]/);
  });

  test("keeps shared controls on generated pixel icons instead of text glyphs", () => {
    assert.match(adminShellSource, /<PixelIcon name="menu" variant="bare" \/>/);
    assert.match(adminShellSource, /<PixelIcon name="close" variant="bare" \/>/);
    assert.doesNotMatch(adminShellSource, />×</);
    assert.doesNotMatch(adminShellSource, />≡</);

    assert.match(buttonSource, /<PixelIcon isActive name="deferred" variant="bare" \/>/);
    assert.doesNotMatch(buttonSource, /\[···\]/);

    assert.match(selectFieldSource, /<PixelIcon name="chevron-down" variant="bare" \/>/);
    assert.doesNotMatch(selectFieldSource, /M4 6l4 4 4-4/);

    assert.match(themeToggleSource, /theme-light/);
    assert.match(themeToggleSource, /theme-dark/);
    assert.match(themeToggleSource, /variant="bare"/);
    assert.doesNotMatch(themeToggleSource, /"LT"/);
    assert.doesNotMatch(themeToggleSource, /"DK"/);

    assert.match(toastSource, /<PixelIcon name="close" variant="bare" \/>/);
    assert.doesNotMatch(toastSource, />×</);
  });

  test("keeps calibrated pixel icon geometry unique and inside the live grid", () => {
    const signatures = new Map();
    const denseIconNames = new Set(["check", "chevron-down", "more"]);

    for (const [name, pattern] of Object.entries(pixelIconPatterns)) {
      assert.ok(pattern.points.length >= (denseIconNames.has(name) ? 3 : 7), `${name} has too few dots`);
      assert.ok(pattern.points.length <= 18, `${name} is too dense`);

      for (const [x, y] of pattern.points) {
        assert.ok(x >= 1 && x <= 5, `${name} x=${x} touches the outer grid`);
        assert.ok(y >= 1 && y <= 5, `${name} y=${y} touches the outer grid`);
      }

      const signature = pattern.points.map((point) => point.join(",")).sort().join("|");
      const previous = signatures.get(signature);
      assert.equal(previous, undefined, `${name} duplicates ${previous}`);
      signatures.set(signature, name);
    }

    const patterns = Object.entries(pixelIconPatterns);
    for (const [index, [name, pattern]] of patterns.entries()) {
      const currentPoints = new Set(pattern.points.map((point) => point.join(",")));

      for (const [otherName, otherPattern] of patterns.slice(index + 1)) {
        const otherPoints = new Set(otherPattern.points.map((point) => point.join(",")));
        const sharedPointCount = [...currentPoints].filter((point) => otherPoints.has(point)).length;
        const unionPointCount = new Set([...currentPoints, ...otherPoints]).size;
        const similarity = sharedPointCount / unionPointCount;

        assert.ok(similarity < 0.7, `${name} and ${otherName} are too similar (${similarity.toFixed(2)})`);
      }
    }
  });
});

function readPixelIconPatterns() {
  const match = pixelIconSource.match(/const pixelIconPatterns = (\{[\s\S]*?\n\}) as const satisfies/);

  assert.ok(match, "pixelIconPatterns object is present");

  return Function(`return (${match[1]})`)() as Record<string, { points: Array<[number, number]> }>;
}
