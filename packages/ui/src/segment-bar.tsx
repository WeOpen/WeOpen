// Segment bar — discrete stepped level meter (battery / capacity / streak).
// Pattern adapted from PROJECT NULLFRAME (MIT, (c) 2026 Mick Cesanek):
// https://github.com/m1ckc3s/nullframe  — re-implemented on WeOpen tokens.
import type { HTMLAttributes } from "react";
import { cn } from "./utils";

export type SegmentBarTone = "accent" | "neutral" | "success" | "warning";

export type SegmentBarProps = HTMLAttributes<HTMLDivElement> & {
  filled: number;
  tone?: SegmentBarTone;
  total: number;
};

export function SegmentBar({ className, filled, tone = "neutral", total, ...props }: SegmentBarProps) {
  const safeTotal = Math.max(0, Math.round(total));
  const filledCount = Math.max(0, Math.min(safeTotal, Math.round(filled)));

  return (
    <div aria-hidden="true" className={cn("weopen-segment-bar", `weopen-segment-bar--${tone}`, className)} {...props}>
      {Array.from({ length: safeTotal }, (_, index) => (
        <i className={index < filledCount ? "is-on" : undefined} key={index} />
      ))}
    </div>
  );
}
