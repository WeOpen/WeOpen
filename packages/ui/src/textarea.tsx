import type { ReactNode, TextareaHTMLAttributes } from "react";
import { cn } from "./utils";

export type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "disabled"> & {
  disabled?: boolean;
  errorMessage?: ReactNode;
  fullWidth?: boolean;
  isDisabled?: boolean;
  isInvalid?: boolean;
  label?: ReactNode;
};

export function Textarea({
  className,
  disabled,
  errorMessage,
  fullWidth = true,
  id,
  isDisabled,
  isInvalid,
  label,
  name,
  ...props
}: TextareaProps) {
  const inputId = id ?? name;
  const textarea = (
    <textarea
      aria-invalid={isInvalid || Boolean(errorMessage) || undefined}
      className={cn("textarea", className)}
      disabled={isDisabled || disabled}
      id={inputId}
      name={name}
      {...props}
    />
  );

  if (!label && !errorMessage) {
    return textarea;
  }

  return (
    <label className={cn("field", { "field--full": fullWidth })}>
      {label ? <span className="field__label">{label}</span> : null}
      {textarea}
      {errorMessage ? <span className="field__error">{errorMessage}</span> : null}
    </label>
  );
}
