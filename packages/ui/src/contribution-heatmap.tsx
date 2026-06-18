// Contribution heatmap — week x day activity grid.
// Pattern adapted from PROJECT NULLFRAME (MIT, (c) 2026 Mick Cesanek):
// https://github.com/m1ckc3s/nullframe  — re-implemented on WeOpen tokens.
import type { CSSProperties, HTMLAttributes } from "react";
import { cn } from "./utils";

export type ContributionHeatmapProps = HTMLAttributes<HTMLDivElement> & {
  columns?: number;
  levels: number[];
  rows?: number;
};

export function ContributionHeatmap({ className, columns = 16, levels, rows = 7, ...props }: ContributionHeatmapProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("weopen-contribution-heatmap", className)}
      style={{ "--weopen-heatmap-columns": columns, "--weopen-heatmap-rows": rows } as CSSProperties}
      {...props}
    >
      {levels.map((level, index) => {
        const step = Math.max(0, Math.min(4, Math.round(level)));
        return <i className={step ? `is-level-${step}` : undefined} key={index} />;
      })}
    </div>
  );
}
