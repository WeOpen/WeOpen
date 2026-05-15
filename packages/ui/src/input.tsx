import type { InputHTMLAttributes } from "react";
import { cn } from "./utils";

/** InputProps keeps the optional label text colocated with native input props. */
export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

/** Input wraps the control in a label and derives htmlFor from id or name. */
export function Input({ className, id, label, ...props }: InputProps) {
  const inputId = id ?? props.name;
  const classes = cn("ui-input", className);

  return (
    <label className="ui-input-field" htmlFor={inputId}>
      {label ? <span className="ui-input-label">{label}</span> : null}
      <input className={classes} id={inputId} {...props} />
    </label>
  );
}
