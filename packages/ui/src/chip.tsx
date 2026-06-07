import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./utils";

export type ChipColor = "default" | "accent" | "success" | "warning" | "danger";
export type ChipVariant = "primary" | "secondary" | "soft" | "outline";
export type ChipSize = "sm" | "md";

export type ChipProps = HTMLAttributes<HTMLSpanElement> & {
  children?: ReactNode;
  color?: ChipColor;
  size?: ChipSize;
  variant?: ChipVariant;
};

function ChipRoot({ children, className, color = "default", size = "md", variant = "outline", ...props }: ChipProps) {
  return (
    <span className={cn("chip", `chip--${color}`, `chip--${size}`, `chip--${variant}`, className)} {...props}>
      {children}
    </span>
  );
}

function ChipLabel({ children, className, ...props }: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span className={cn("chip__label", className)} {...props}>
      {children}
    </span>
  );
}

export const Chip = Object.assign(ChipRoot, { Label: ChipLabel });
