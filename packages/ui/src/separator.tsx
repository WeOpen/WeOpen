import type { HTMLAttributes } from "react";
import { cn } from "./utils";

export type SeparatorProps = HTMLAttributes<HTMLDivElement> & {
  orientation?: "horizontal" | "vertical";
};

export function Separator({ className, orientation = "horizontal", ...props }: SeparatorProps) {
  return <div className={cn("separator", `separator--${orientation}`, className)} role="separator" {...props} />;
}
