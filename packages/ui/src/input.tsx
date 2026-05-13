import type { InputHTMLAttributes } from "react";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export function Input({ className, id, label, ...props }: InputProps) {
  const inputId = id ?? props.name;
  const classes = ["ui-input", className].filter(Boolean).join(" ");

  return (
    <label className="ui-input-field" htmlFor={inputId}>
      {label ? <span className="ui-input-label">{label}</span> : null}
      <input className={classes} id={inputId} {...props} />
    </label>
  );
}
