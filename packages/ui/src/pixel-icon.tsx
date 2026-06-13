import type { CSSProperties } from "react";
import { cn } from "./utils";

type PixelCoordinate = readonly [number, number];

type PixelIconPattern = {
  points: readonly PixelCoordinate[];
};

const pixelIconPatterns = {
  api: { points: [[3, 1], [2, 2], [3, 2], [4, 2], [1, 3], [2, 3], [4, 3], [5, 3], [2, 4], [3, 4], [4, 4], [3, 5]] },
  auth: { points: [[2, 1], [3, 1], [1, 2], [4, 2], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [4, 4], [5, 4]] },
  blog: { points: [[2, 1], [3, 1], [4, 1], [2, 2], [5, 2], [2, 3], [3, 3], [4, 3], [2, 4], [4, 4], [2, 5], [3, 5], [4, 5], [5, 5]] },
  bucket: { points: [[1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [2, 3], [4, 3], [2, 4], [4, 4], [2, 5], [3, 5], [4, 5]] },
  categories: { points: [[1, 1], [2, 1], [1, 2], [2, 2], [4, 1], [5, 1], [4, 2], [5, 2], [2, 4], [3, 4], [4, 4], [2, 5], [3, 5], [4, 5]] },
  check: { points: [[1, 3], [2, 4], [3, 5], [4, 3], [5, 2]] },
  "chevron-down": { points: [[1, 2], [2, 3], [3, 4], [4, 3], [5, 2]] },
  close: { points: [[1, 1], [5, 1], [2, 2], [4, 2], [3, 3], [2, 4], [4, 4], [1, 5], [5, 5]] },
  cloud: { points: [[3, 1], [4, 1], [2, 2], [5, 2], [1, 3], [5, 3], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4]] },
  code: { points: [[2, 1], [1, 2], [2, 3], [1, 4], [2, 5], [4, 1], [5, 2], [4, 3], [5, 4], [4, 5]] },
  command: { points: [[1, 2], [2, 3], [1, 4], [4, 1], [4, 2], [4, 3], [4, 4], [4, 5], [5, 5]] },
  dashboard: { points: [[1, 1], [2, 1], [1, 2], [2, 2], [4, 1], [5, 1], [4, 2], [5, 2], [1, 4], [2, 4], [1, 5], [2, 5], [4, 4], [5, 4], [4, 5], [5, 5]] },
  deferred: { points: [[1, 1], [2, 1], [4, 1], [5, 1], [3, 2], [3, 3], [2, 4], [4, 4], [1, 5], [2, 5], [4, 5], [5, 5]] },
  dns: { points: [[3, 1], [3, 2], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [1, 4], [3, 4], [5, 4], [1, 5], [3, 5], [5, 5]] },
  domains: { points: [[2, 1], [3, 1], [4, 1], [3, 2], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [3, 4], [2, 5], [3, 5], [4, 5]] },
  empty: { points: [[2, 2], [3, 2], [4, 2], [2, 3], [4, 3], [2, 4], [3, 4], [4, 4]] },
  fallback: { points: [[2, 1], [3, 1], [4, 1], [5, 2], [4, 3], [3, 3], [3, 5], [4, 5]] },
  header: { points: [[1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [1, 3], [2, 3], [4, 3], [5, 3], [1, 4], [2, 4], [4, 5], [5, 5]] },
  health: { points: [[1, 4], [2, 4], [3, 2], [3, 5], [4, 3], [5, 3], [5, 2], [5, 4]] },
  logout: { points: [[1, 1], [2, 1], [1, 2], [1, 3], [1, 4], [1, 5], [2, 5], [3, 3], [4, 3], [5, 3], [4, 2], [4, 4]] },
  menu: { points: [[1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5]] },
  more: { points: [[1, 3], [3, 3], [5, 3]] },
  objects: { points: [[2, 1], [3, 1], [4, 1], [1, 2], [2, 2], [4, 2], [5, 2], [1, 3], [3, 3], [5, 3], [2, 4], [4, 4], [2, 5], [3, 5], [4, 5]] },
  plugins: { points: [[3, 1], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [2, 3], [3, 3], [4, 3], [1, 4], [3, 4], [5, 4], [3, 5]] },
  routes: { points: [[1, 1], [2, 1], [4, 1], [5, 1], [2, 2], [4, 2], [2, 3], [3, 3], [4, 3], [2, 4], [4, 4], [1, 5], [2, 5], [4, 5], [5, 5]] },
  runtime: { points: [[2, 1], [4, 1], [1, 2], [3, 2], [5, 2], [1, 4], [3, 4], [5, 4], [2, 5], [4, 5]] },
  service: { points: [[1, 1], [2, 1], [3, 1], [4, 1], [1, 2], [4, 2], [1, 3], [2, 3], [3, 3], [4, 3], [5, 4], [5, 5]] },
  settings: { points: [[2, 1], [4, 1], [2, 2], [3, 2], [4, 2], [2, 3], [4, 3], [1, 4], [2, 4], [4, 4], [5, 4], [2, 5], [4, 5]] },
  status: { points: [[3, 1], [2, 2], [4, 2], [1, 3], [3, 3], [5, 3], [2, 4], [4, 4], [3, 5]] },
  storage: { points: [[2, 1], [3, 1], [4, 1], [1, 2], [5, 2], [1, 3], [3, 3], [5, 3], [1, 4], [5, 4], [2, 5], [3, 5], [4, 5]] },
  system: { points: [[3, 1], [1, 2], [5, 2], [2, 3], [3, 3], [4, 3], [1, 4], [5, 4], [3, 5]] },
  tls: { points: [[2, 2], [2, 1], [3, 1], [4, 1], [4, 2], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [1, 4], [5, 4], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5]] },
  tools: { points: [[4, 1], [5, 1], [5, 2], [4, 3], [3, 3], [3, 4], [2, 5], [1, 5], [1, 4]] },
  "trend-down": { points: [[1, 1], [1, 2], [2, 2], [2, 3], [3, 3], [4, 4], [5, 5], [3, 5], [4, 5], [5, 4]] },
  "trend-up": { points: [[1, 5], [1, 4], [2, 4], [2, 3], [3, 3], [4, 2], [5, 1], [3, 1], [4, 1], [5, 2]] },
  "theme-dark": { points: [[3, 1], [4, 1], [2, 2], [3, 2], [2, 3], [3, 3], [4, 3], [2, 4], [3, 4], [3, 5], [4, 5]] },
  "theme-light": { points: [[1, 1], [5, 1], [2, 2], [3, 2], [4, 2], [2, 3], [4, 3], [2, 4], [3, 4], [4, 4], [1, 5], [5, 5]] },
  upload: { points: [[3, 1], [2, 2], [3, 2], [4, 2], [3, 3], [3, 4], [1, 5], [2, 5], [4, 5], [5, 5]] },
  warning: { points: [[3, 1], [2, 2], [4, 2], [2, 3], [3, 3], [4, 3], [3, 4], [1, 5], [2, 5], [3, 5], [4, 5], [5, 5]] }
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
          height="2.25"
          key={`${x}-${y}-${index}`}
          rx="0.35"
          style={pixelDotStyle(index, x, y)}
          width="2.25"
          x={3.9 + x * 3.35}
          y={3.9 + y * 3.35}
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

function pixelDotStyle(index: number, x: number, y: number): CSSProperties {
  return {
    "--dot-index": `${index}`,
    "--dot-offset-x": `${(x - 3) * 0.42}px`,
    "--dot-offset-y": `${(y - 3) * 0.34}px`
  } as CSSProperties;
}
