import type { ButtonHTMLAttributes, MouseEventHandler, ReactNode } from "react";
import { cn } from "./utils";

type ButtonVariant =
  | "default"
  | "primary"
  | "secondary"
  | "tertiary"
  | "outline"
  | "ghost"
  | "destructive"
  | "danger"
  | "danger-soft"
  | "link";
type ButtonSize = "default" | "xs" | "sm" | "lg" | "icon" | "icon-sm" | "icon-lg";

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "disabled" | "onClick" | "size"> & {
  children?: ReactNode;
  disabled?: boolean;
  fullWidth?: boolean;
  isDisabled?: boolean;
  isIconOnly?: boolean;
  isPending?: boolean;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  onPress?: () => void;
  size?: ButtonSize;
  variant?: ButtonVariant;
};

export function Button({
  children,
  className,
  disabled,
  fullWidth,
  isDisabled,
  isIconOnly,
  isPending,
  onClick,
  onPress,
  size = "default",
  type = "button",
  variant = "default",
  ...props
}: ButtonProps) {
  const normalizedVariant = normalizeVariant(variant);
  const normalizedSize = normalizeSize(size, isIconOnly);
  const isButtonDisabled = disabled ?? isDisabled ?? isPending ?? false;
  const handleClick: MouseEventHandler<HTMLButtonElement> | undefined = onClick || onPress
    ? (event) => {
        onClick?.(event);
        if (!event.defaultPrevented) {
          onPress?.();
        }
      }
    : undefined;

  return (
    <button
      className={cn(
        "button",
        `button--${normalizedVariant}`,
        `button--${normalizedSize}`,
        {
          "button--full": fullWidth,
          "button--icon-only": isIconOnly || size.startsWith("icon"),
          "button--pending": isPending
        },
        className
      )}
      disabled={isButtonDisabled}
      onClick={handleClick}
      type={type}
      {...props}
    >
      {isPending ? <span aria-hidden="true" className="button__pending">[···]</span> : null}
      {children}
    </button>
  );
}

function normalizeVariant(variant: ButtonVariant) {
  if (variant === "default") {
    return "primary";
  }
  if (variant === "outline") {
    return "secondary";
  }
  if (variant === "destructive") {
    return "danger";
  }
  if (variant === "link") {
    return "ghost";
  }
  return variant;
}

function normalizeSize(size: ButtonSize, isIconOnly?: boolean) {
  if (size === "default") {
    return "md";
  }
  if (isIconOnly && size === "sm") {
    return "icon-sm";
  }
  if (isIconOnly && size === "lg") {
    return "icon-lg";
  }
  if (isIconOnly) {
    return "icon";
  }
  return size;
}
