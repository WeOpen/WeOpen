import type { CSSProperties } from "react";
import { cn } from "./utils";

// WeOpen brand "W" letterform in the pixel-dot language. Tight and tile-less:
// the dots inherit `currentColor` so the mark can stand in for the "W" in the
// WEOPEN wordmark or sit on any surface, and `height` maps directly to the
// glyph height. One pixel (the top-right tip) is the fixed Nothing-style red
// accent. Each dot carries `--dot-index` (its column) so a host can drive a
// staggered left-to-right hover/idle animation. The browser-tab favicon keeps
// its own dark tile in /favicon.svg.
const W_DOTS: ReadonlyArray<readonly [number, number]> = [
  [1, 1], [1, 2], [4, 2], [7, 2], [2, 3], [4, 3], [6, 3], [2, 4], [3, 4], [5, 4], [6, 4], [3, 5], [5, 5]
];
const W_TIP: readonly [number, number] = [7, 1];

const COLUMNS = 7;
const ROWS = 5;
const STEP = 2.75;
const DOT = 2.25;
const VIEW_W = (COLUMNS - 1) * STEP + DOT;
const VIEW_H = (ROWS - 1) * STEP + DOT;
const round = (value: number): number => Number(value.toFixed(2));
const DOT_RADIUS = round(DOT * 0.18);
const columnIndexStyle = (column: number): CSSProperties => ({ "--dot-index": `${column}` } as CSSProperties);

export type WeOpenMarkProps = {
  className?: string;
  title?: string;
};

export function WeOpenMark({ className, title }: WeOpenMarkProps) {
  return (
    <svg
      aria-hidden={title ? undefined : true}
      aria-label={title}
      className={cn("weopen-brand-mark", className)}
      focusable="false"
      role={title ? "img" : undefined}
      viewBox={`0 0 ${round(VIEW_W)} ${round(VIEW_H)}`}
      xmlns="http://www.w3.org/2000/svg"
    >
      {W_DOTS.map(([x, y], index) => (
        <rect
          className="weopen-brand-mark-dot"
          fill="currentColor"
          height={DOT}
          key={`${x}-${y}-${index}`}
          rx={DOT_RADIUS}
          style={columnIndexStyle(x)}
          width={DOT}
          x={round((x - 1) * STEP)}
          y={round((y - 1) * STEP)}
        />
      ))}
      <rect
        className="weopen-brand-mark-tip"
        fill="#d71921"
        height={DOT}
        rx={DOT_RADIUS}
        style={columnIndexStyle(W_TIP[0])}
        width={DOT}
        x={round((W_TIP[0] - 1) * STEP)}
        y={round((W_TIP[1] - 1) * STEP)}
      />
    </svg>
  );
}
