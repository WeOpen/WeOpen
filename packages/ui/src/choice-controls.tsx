"use client";

import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "./utils";

type ChoiceControlBaseProps = Omit<InputHTMLAttributes<HTMLInputElement>, "disabled" | "type"> & {
  description?: ReactNode;
  disabled?: boolean;
  isDisabled?: boolean;
  label?: ReactNode;
};

export type CheckboxProps = ChoiceControlBaseProps;
export type RadioProps = ChoiceControlBaseProps;
export type SwitchProps = ChoiceControlBaseProps;

export function Checkbox({
  className,
  description,
  disabled,
  isDisabled,
  label,
  ...props
}: CheckboxProps) {
  return (
    <label className={cn("choice-control", "choice-control--checkbox", className)}>
      <input className="choice-control__input" disabled={disabled || isDisabled} type="checkbox" {...props} />
      <span className="choice-control__box" aria-hidden="true"><span /></span>
      <ChoiceControlCopy description={description} label={label} />
    </label>
  );
}

export function Radio({
  className,
  description,
  disabled,
  isDisabled,
  label,
  ...props
}: RadioProps) {
  return (
    <label className={cn("choice-control", "choice-control--radio", className)}>
      <input className="choice-control__input" disabled={disabled || isDisabled} type="radio" {...props} />
      <span className="choice-control__box" aria-hidden="true"><span /></span>
      <ChoiceControlCopy description={description} label={label} />
    </label>
  );
}

export function Switch({
  className,
  description,
  disabled,
  isDisabled,
  label,
  ...props
}: SwitchProps) {
  return (
    <label className={cn("choice-control", "choice-control--switch", className)}>
      <input
        className="choice-control__input"
        disabled={disabled || isDisabled}
        role="switch"
        type="checkbox"
        {...props}
      />
      <span className="choice-control__switch" aria-hidden="true"><span /></span>
      <ChoiceControlCopy description={description} label={label} />
    </label>
  );
}

function ChoiceControlCopy({
  description,
  label
}: {
  description?: ReactNode;
  label?: ReactNode;
}) {
  if (!label && !description) {
    return null;
  }

  return (
    <span className="choice-control__copy">
      {label ? <span className="choice-control__label">{label}</span> : null}
      {description ? <span className="choice-control__description">{description}</span> : null}
    </span>
  );
}
