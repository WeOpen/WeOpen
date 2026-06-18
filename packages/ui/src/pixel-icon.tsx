import type { CSSProperties } from "react";
import { cn } from "./utils";

type PixelCoordinate = readonly [number, number];

type PixelIconPattern = {
  points: readonly PixelCoordinate[];
};

// Every icon is drawn on a single 7x7 coordinate grid (1..7 on both axes).
// Detailed metaphors (gear, chip, padlock, globe) get the resolution they need,
// while tiny controls (check, chevron, more) simply use fewer dots on the same
// grid so the whole set reads as one consistent pixel system.
const pixelIconPatterns = {
  api: { points: [[3, 1], [5, 1], [2, 2], [6, 2], [2, 3], [6, 3], [1, 4], [7, 4], [2, 5], [6, 5], [2, 6], [6, 6], [3, 7], [5, 7]] },
  auth: { points: [[2, 2], [3, 2], [1, 3], [4, 3], [1, 4], [4, 4], [2, 5], [3, 5], [5, 4], [6, 4], [7, 4], [6, 5]] },
  blog: { points: [[2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [2, 2], [6, 2], [2, 3], [3, 3], [4, 3], [5, 3], [2, 4], [6, 4], [2, 5], [3, 5], [4, 5], [5, 5], [2, 6], [6, 6], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7]] },
  bucket: { points: [[1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2], [2, 3], [6, 3], [2, 4], [6, 4], [3, 5], [5, 5], [3, 6], [5, 6], [4, 7]] },
  calendar: { points: [[2, 1], [2, 2], [6, 1], [6, 2], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [1, 5], [3, 5], [5, 5], [7, 5], [1, 6], [4, 6], [6, 6], [7, 6], [1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7], [7, 7]] },
  categories: { points: [[2, 2], [4, 2], [5, 2], [2, 4], [4, 4], [5, 4], [2, 6], [4, 6], [5, 6]] },
  check: { points: [[1, 4], [2, 5], [3, 6], [4, 5], [5, 4], [6, 3], [7, 2]] },
  "chevron-down": { points: [[1, 3], [2, 4], [3, 5], [4, 6], [5, 5], [6, 4], [7, 3]] },
  "chevron-left": { points: [[5, 1], [4, 2], [3, 3], [2, 4], [3, 5], [4, 6], [5, 7]] },
  "chevron-right": { points: [[3, 1], [4, 2], [5, 3], [6, 4], [5, 5], [4, 6], [3, 7]] },
  close: { points: [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7], [7, 1], [6, 2], [5, 3], [3, 5], [2, 6], [1, 7]] },
  cloud: { points: [[3, 2], [4, 2], [5, 2], [2, 3], [6, 3], [1, 4], [7, 4], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5], [6, 5], [7, 5]] },
  code: { points: [[3, 2], [2, 3], [1, 4], [2, 5], [3, 6], [5, 2], [6, 3], [7, 4], [6, 5], [5, 6]] },
  command: { points: [[2, 2], [3, 3], [4, 4], [3, 5], [2, 6], [5, 6], [6, 6]] },
  dashboard: { points: [[2, 2], [3, 2], [2, 3], [3, 3], [5, 2], [6, 2], [5, 3], [6, 3], [2, 5], [3, 5], [2, 6], [3, 6], [5, 5], [6, 5], [5, 6], [6, 6]] },
  deferred: { points: [[3, 2], [4, 2], [5, 2], [2, 3], [4, 3], [6, 3], [2, 4], [4, 4], [5, 4], [6, 4], [2, 5], [6, 5], [3, 6], [4, 6], [5, 6]] },
  dns: { points: [[4, 1], [4, 2], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [2, 4], [4, 4], [6, 4], [2, 5], [4, 5], [6, 5]] },
  domains: { points: [[3, 1], [4, 1], [5, 1], [2, 2], [6, 2], [1, 3], [7, 3], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [1, 5], [7, 5], [2, 6], [6, 6], [3, 7], [4, 7], [5, 7], [4, 2], [4, 3], [4, 5], [4, 6]] },
  empty: { points: [[2, 3], [6, 3], [1, 4], [2, 4], [6, 4], [7, 4], [1, 5], [7, 5], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6], [7, 6]] },
  "expand-down": { points: [[4, 2], [4, 3], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [3, 5], [4, 5], [5, 5], [4, 6]] },
  fallback: { points: [[3, 1], [4, 1], [2, 2], [5, 2], [6, 3], [5, 4], [4, 4], [4, 5], [4, 7]] },
  header: { points: [[2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [3, 4], [4, 4], [5, 4], [3, 5], [4, 5], [5, 5]] },
  health: { points: [[1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [4, 2], [4, 3], [5, 5], [5, 6]] },
  logout: { points: [[2, 1], [3, 1], [4, 1], [2, 2], [2, 3], [4, 4], [5, 4], [6, 4], [7, 4], [6, 3], [6, 5], [2, 5], [2, 6], [2, 7], [3, 7], [4, 7]] },
  menu: { points: [[2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6]] },
  more: { points: [[2, 4], [4, 4], [6, 4]] },
  objects: { points: [[3, 2], [4, 2], [5, 2], [6, 2], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [2, 4], [5, 4], [6, 4], [2, 5], [3, 5], [4, 5], [5, 5]] },
  plugins: { points: [[3, 1], [5, 1], [3, 2], [5, 2], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [2, 4], [6, 4], [3, 5], [4, 5], [5, 5], [4, 6], [4, 7]] },
  routes: { points: [[2, 1], [6, 1], [2, 2], [6, 2], [2, 3], [6, 3], [3, 4], [5, 4], [4, 5], [4, 6], [4, 7]] },
  runtime: { points: [[2, 2], [2, 3], [3, 3], [2, 4], [3, 4], [4, 4], [5, 4], [2, 5], [3, 5], [2, 6]] },
  service: { points: [[3, 1], [4, 1], [5, 1], [3, 2], [4, 2], [5, 2], [3, 3], [5, 3], [3, 4], [4, 4], [5, 4], [3, 5], [5, 5], [3, 6], [4, 6], [5, 6], [3, 7], [4, 7], [5, 7]] },
  settings: { points: [[4, 1], [3, 2], [4, 2], [5, 2], [2, 3], [3, 3], [5, 3], [6, 3], [1, 4], [2, 4], [6, 4], [7, 4], [2, 5], [3, 5], [5, 5], [6, 5], [3, 6], [4, 6], [5, 6], [4, 7]] },
  status: { points: [[2, 6], [2, 5], [4, 6], [4, 5], [4, 4], [6, 6], [6, 5], [6, 4], [6, 3], [6, 2]] },
  storage: { points: [[3, 1], [4, 1], [5, 1], [2, 2], [6, 2], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [2, 4], [6, 4], [2, 5], [6, 5], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6], [3, 7], [4, 7], [5, 7]] },
  system: { points: [[4, 1], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [2, 3], [6, 3], [1, 4], [4, 4], [7, 4], [2, 5], [6, 5], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6], [4, 7]] },
  tls: { points: [[3, 1], [4, 1], [5, 1], [2, 2], [6, 2], [2, 3], [6, 3], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [1, 5], [7, 5], [1, 6], [4, 6], [7, 6], [1, 7], [2, 7], [3, 7], [4, 7], [5, 7], [6, 7], [7, 7]] },
  tools: { points: [[5, 1], [6, 1], [7, 1], [6, 2], [5, 2], [4, 3], [5, 3], [3, 4], [4, 4], [2, 5], [3, 5], [1, 6], [2, 6], [1, 7]] },
  "trend-down": { points: [[1, 2], [2, 3], [3, 3], [4, 4], [5, 5], [6, 6], [7, 6], [7, 5], [7, 4], [5, 6]] },
  "trend-up": { points: [[1, 6], [2, 5], [3, 5], [4, 4], [5, 3], [6, 2], [7, 2], [7, 3], [7, 4], [5, 2]] },
  "theme-dark": { points: [[4, 1], [5, 1], [3, 2], [4, 2], [2, 3], [3, 3], [2, 4], [3, 4], [6, 4], [2, 5], [3, 5], [5, 5], [6, 5], [3, 6], [4, 6], [5, 6]] },
  "theme-light": { points: [[4, 1], [4, 7], [1, 4], [7, 4], [2, 2], [6, 2], [2, 6], [6, 6], [3, 3], [4, 3], [5, 3], [3, 4], [5, 4], [3, 5], [4, 5], [5, 5]] },
  upload: { points: [[4, 1], [3, 2], [5, 2], [2, 3], [4, 3], [6, 3], [4, 4], [4, 5], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6], [2, 7], [6, 7]] },
  warning: { points: [[4, 1], [3, 2], [5, 2], [3, 3], [4, 3], [5, 3], [2, 4], [4, 4], [6, 4], [2, 5], [4, 5], [6, 5], [1, 6], [2, 6], [3, 6], [4, 6], [5, 6], [6, 6], [7, 6]] }
} as const satisfies Record<string, PixelIconPattern>;

export type PixelIconName = keyof typeof pixelIconPatterns;
export type PixelIconVariant = "bare" | "framed";

export type PixelIconProps = {
  className?: string;
  isActive?: boolean;
  name: PixelIconName | string;
  title?: string;
  variant?: PixelIconVariant;
};

export function PixelIcon({ className, isActive, name, title, variant = "framed" }: PixelIconProps) {
  const pattern = pixelIconPatternForName(name);

  return (
    <svg
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={cn("weopen-pixel-icon", className)}
      data-active={isActive ? "true" : undefined}
      data-variant={variant}
      focusable="false"
      role={title ? "img" : undefined}
      viewBox="0 0 28 28"
    >
      {variant === "framed" ? <path className="weopen-pixel-icon-frame" d="M3.5 3.5H24.5V24.5H3.5Z" vectorEffect="non-scaling-stroke" /> : null}
      <path className="weopen-pixel-icon-scan" d="M4 4H24" vectorEffect="non-scaling-stroke" />
      {pattern.points.map(([x, y], index) => (
        <rect
          className="weopen-pixel-icon-dot"
          height={PIXEL_DOT_SIZE}
          key={`${x}-${y}-${index}`}
          rx="0.35"
          style={pixelDotStyle(index, x, y)}
          width={PIXEL_DOT_SIZE}
          x={pixelDotPosition(x)}
          y={pixelDotPosition(y)}
        />
      ))}
    </svg>
  );
}

function pixelIconPatternForName(name: PixelIconName | string): PixelIconPattern {
  if (Object.prototype.hasOwnProperty.call(pixelIconPatterns, name)) {
    return pixelIconPatterns[name as PixelIconName];
  }

  return pixelIconPatterns.fallback;
}

// 7x7 dot matrix mapped into a 28x28 viewBox. The grid is centered so its
// middle coordinate sits exactly on the viewBox center (14) with symmetric
// breathing room inside the frame, instead of drifting toward one corner.
const PIXEL_VIEWBOX = 28;
const PIXEL_GRID = 7;
const PIXEL_DOT_SIZE = 2.25;
const PIXEL_STEP = 2.75;
const PIXEL_GRID_CENTER = (PIXEL_GRID + 1) / 2;
const PIXEL_MARGIN = (PIXEL_VIEWBOX - ((PIXEL_GRID - 1) * PIXEL_STEP + PIXEL_DOT_SIZE)) / 2;

function pixelDotPosition(coordinate: number): number {
  return PIXEL_MARGIN + (coordinate - 1) * PIXEL_STEP;
}

function pixelDotStyle(index: number, x: number, y: number): CSSProperties {
  return {
    "--dot-index": `${index}`,
    "--dot-offset-x": `${(x - PIXEL_GRID_CENTER) * 0.42}px`,
    "--dot-offset-y": `${(y - PIXEL_GRID_CENTER) * 0.34}px`
  } as CSSProperties;
}
