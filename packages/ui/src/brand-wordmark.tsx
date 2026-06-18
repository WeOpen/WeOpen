import type { CSSProperties } from "react";
import { cn } from "./utils";

// "WEOPEN" rendered as one pixel-dot wordmark in the same 5-row dot grammar and
// weight as the WeOpenMark "W", so the whole word reads as a single custom mark
// (no font fallback). Dots reuse the shared `weopen-brand-mark-dot` / `-tip`
// classes and carry `--dot-index` (absolute column) so a host can ripple a
// staggered hover/idle animation left-to-right across every letter. The single
// red pixel — the Nothing accent — sits on the W's top-right tip, matching
// WeOpenMark and the favicon.
type LetterGlyph = { width: number; dots: ReadonlyArray<readonly [number, number]> };

const LETTERS: Record<string, LetterGlyph> = {
  W: { width: 7, dots: [[1, 1], [7, 1], [1, 2], [4, 2], [7, 2], [2, 3], [4, 3], [6, 3], [2, 4], [3, 4], [5, 4], [6, 4], [3, 5], [5, 5]] },
  E: { width: 4, dots: [[1, 1], [2, 1], [3, 1], [4, 1], [1, 2], [1, 3], [2, 3], [3, 3], [1, 4], [1, 5], [2, 5], [3, 5], [4, 5]] },
  O: { width: 5, dots: [[2, 1], [3, 1], [4, 1], [1, 2], [5, 2], [1, 3], [5, 3], [1, 4], [5, 4], [2, 5], [3, 5], [4, 5]] },
  P: { width: 4, dots: [[1, 1], [2, 1], [3, 1], [1, 2], [4, 2], [1, 3], [2, 3], [3, 3], [1, 4], [1, 5]] },
  N: { width: 5, dots: [[1, 1], [5, 1], [1, 2], [2, 2], [5, 2], [1, 3], [3, 3], [5, 3], [1, 4], [4, 4], [5, 4], [1, 5], [5, 5]] }
};

const WORD = ["W", "E", "O", "P", "E", "N"] as const;
const LETTER_GAP = 1;
const ROWS = 5;
const STEP = 2.75;
const DOT = 2.25;
const RED_TIP = { column: 7, row: 1 } as const;

type PlacedDot = { column: number; row: number; isTip: boolean };

const { placedDots, totalColumns } = (() => {
  const placed: PlacedDot[] = [];
  let offset = 0;
  WORD.forEach((char, letterIndex) => {
    const letter = LETTERS[char];
    const isFirstW = letterIndex === 0 && char === "W";
    for (const [x, y] of letter.dots) {
      placed.push({
        column: offset + x,
        row: y,
        isTip: isFirstW && x === RED_TIP.column && y === RED_TIP.row
      });
    }
    offset += letter.width + LETTER_GAP;
  });
  return { placedDots: placed, totalColumns: offset - LETTER_GAP };
})();

const VIEW_W = (totalColumns - 1) * STEP + DOT;
const VIEW_H = (ROWS - 1) * STEP + DOT;
const round = (value: number): number => Number(value.toFixed(2));
const DOT_RADIUS = round(DOT * 0.18);

export type WeOpenWordmarkProps = {
  className?: string;
  title?: string;
};

export function WeOpenWordmark({ className, title }: WeOpenWordmarkProps) {
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
      {placedDots.map(({ column, row, isTip }, index) => (
        <rect
          className={isTip ? "weopen-brand-mark-tip" : "weopen-brand-mark-dot"}
          fill={isTip ? "#d71921" : "currentColor"}
          height={DOT}
          key={index}
          rx={DOT_RADIUS}
          style={{ "--dot-index": `${column}` } as CSSProperties}
          width={DOT}
          x={round((column - 1) * STEP)}
          y={round((row - 1) * STEP)}
        />
      ))}
    </svg>
  );
}
