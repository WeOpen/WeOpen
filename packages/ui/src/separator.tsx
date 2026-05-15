import type { HTMLAttributes } from "react";
import { cn } from "./utils";

export type SeparatorProps = HTMLAttributes<HTMLDivElement> & {
  orientation?: "horizontal" | "vertical";
};

/** Separator provides the same low-contrast divider primitive used throughout thesvg. */
export function Separator({ className, orientation = "horizontal", role, ...props }: SeparatorProps) {
  return (
    <div
      aria-orientation={orientation}
      className={cn("ui-separator", `ui-separator-${orientation}`, className)}
      role={role ?? "separator"}
      {...props}
    />
  );
}
