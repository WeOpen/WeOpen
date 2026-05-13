import type { ButtonHTMLAttributes } from "react";

type ButtonVariant = "primary" | "secondary" | "ghost";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
};

export function Button({
  className,
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  const classes = ["ui-button", `ui-button-${variant}`, className]
    .filter(Boolean)
    .join(" ");

  return <button className={classes} type={type} {...props} />;
}
