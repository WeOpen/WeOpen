// Ring gauge — circular progress dial with a centered readout.
// Pattern adapted from PROJECT NULLFRAME (MIT, (c) 2026 Mick Cesanek):
// https://github.com/m1ckc3s/nullframe  — re-implemented on WeOpen tokens.
import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./utils";

const RING_RADIUS = 50;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export type RingGaugeTone = "accent" | "neutral" | "success";

export type RingGaugeProps = HTMLAttributes<HTMLDivElement> & {
  label?: ReactNode;
  max?: number;
  tone?: RingGaugeTone;
  unit?: ReactNode;
  value: number;
};

export function RingGauge({ className, label, max = 100, tone = "accent", unit, value, ...props }: RingGaugeProps) {
  const ratio = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;

  return (
    <div className={cn("weopen-ring-gauge", `weopen-ring-gauge--${tone}`, className)} {...props}>
      <svg aria-hidden="true" viewBox="0 0 110 110">
        <circle className="weopen-ring-gauge__track" cx="55" cy="55" r={RING_RADIUS} />
        <circle
          className="weopen-ring-gauge__value"
          cx="55"
          cy="55"
          r={RING_RADIUS}
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={RING_CIRCUMFERENCE * (1 - ratio)}
        />
      </svg>
      <div className="weopen-ring-gauge__readout">
        <strong>{value}</strong>
        {unit ? <small>{unit}</small> : null}
      </div>
      {label ? <span className="weopen-ring-gauge__label">{label}</span> : null}
    </div>
  );
}
