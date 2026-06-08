"use client";

import type { ReactNode, SelectHTMLAttributes } from "react";
import { cn } from "./utils";

export type SelectFieldOption = {
  label: ReactNode;
  value: string;
  disabled?: boolean;
};

export type SelectFieldProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "onChange" | "value"> & {
  label: ReactNode;
  placeholder?: string;
  value: string;
  options: SelectFieldOption[];
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function SelectField({
  className,
  disabled,
  label,
  name,
  onChange,
  options,
  placeholder = "请选择",
  value,
  ...props
}: SelectFieldProps) {
  return (
    <label className="field field--full">
      <span className="field__label">{label}</span>
      <span className="select-field">
        <select
          className={cn("select", className)}
          disabled={disabled}
          name={name}
          onChange={(event) => onChange(event.currentTarget.value)}
          value={value}
          {...props}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option disabled={option.disabled} key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}
