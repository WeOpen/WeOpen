import type { ButtonHTMLAttributes } from "react";
import { cn } from "./utils";

type ButtonVariant =
  | "default"
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "link";
type ButtonSize = "default" | "xs" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg";

/** ButtonProps extends native button attributes with WeOpen visual variants. */
export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

/** Button defaults to type="button" so shared forms do not submit accidentally. */
export function Button({
  className,
  size = "default",
  variant = "default",
  type = "button",
  ...props
}: ButtonProps) {
  const classes = cn("ui-button", `ui-button-${variant}`, size !== "default" && `ui-button-${size}`, className);

  return <button className={classes} type={type} {...props} />;
}
