import type { ReactNode } from "react";
import type { ChipProps } from "./chip";
import { Chip } from "./chip";

export type StatusChipTone = "neutral" | "success" | "warning" | "danger" | "accent";

export type StatusChipProps = Omit<ChipProps, "color" | "variant"> & {
  tone?: StatusChipTone;
  children: ReactNode;
};

export function StatusChip({ children, tone = "neutral", ...props }: StatusChipProps) {
  return (
    <Chip color={colorForTone(tone)} size="sm" variant="outline" {...props}>
      <span aria-hidden="true" className="status-dot" />
      <Chip.Label>{children}</Chip.Label>
    </Chip>
  );
}

function colorForTone(tone: StatusChipTone): ChipProps["color"] {
  if (tone === "success") {
    return "success";
  }
  if (tone === "warning") {
    return "warning";
  }
  if (tone === "danger") {
    return "danger";
  }
  if (tone === "accent") {
    return "accent";
  }
  return "default";
}
