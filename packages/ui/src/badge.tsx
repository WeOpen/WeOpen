import type { HTMLAttributes } from "react";
import { cn } from "./utils";

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "ghost" | "success" | "warning";

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  variant?: BadgeVariant;
};

/** Badge mirrors thesvg's compact status pills without requiring shadcn/Base UI. */
export function Badge({ className, variant = "default", ...props }: BadgeProps) {
  return <span className={cn("ui-badge", `ui-badge-${variant}`, className)} {...props} />;
}
