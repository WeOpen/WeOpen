import type { ChipProps } from "./chip";
import { Chip } from "./chip";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "ghost" | "success" | "warning";

export type BadgeProps = Omit<ChipProps, "color" | "variant"> & {
  variant?: BadgeVariant;
};

export function Badge({ variant = "default", ...props }: BadgeProps) {
  return <Chip color={colorForVariant(variant)} size="sm" variant={variant === "default" ? "primary" : "outline"} {...props} />;
}

function colorForVariant(variant: BadgeVariant): ChipProps["color"] {
  if (variant === "destructive") {
    return "danger";
  }
  if (variant === "success") {
    return "success";
  }
  if (variant === "warning") {
    return "warning";
  }
  if (variant === "secondary" || variant === "ghost" || variant === "outline") {
    return "default";
  }
  return "accent";
}
