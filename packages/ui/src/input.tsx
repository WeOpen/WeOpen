import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "./utils";

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "disabled"> & {
  disabled?: boolean;
  errorMessage?: ReactNode;
  fullWidth?: boolean;
  isDisabled?: boolean;
  isInvalid?: boolean;
  label?: ReactNode;
};

export function Input({
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
}: InputProps) {
  const inputId = id ?? name;
  const input = (
    <input
      aria-invalid={isInvalid || Boolean(errorMessage) || undefined}
      className={cn("input", className)}
      disabled={isDisabled || disabled}
      id={inputId}
      name={name}
      {...props}
    />
  );

  if (!label && !errorMessage) {
    return input;
  }

  return (
    <label className={cn("field", { "field--full": fullWidth })}>
      {label ? <span className="field__label">{label}</span> : null}
      {input}
      {errorMessage ? <span className="field__error">{errorMessage}</span> : null}
    </label>
  );
}
