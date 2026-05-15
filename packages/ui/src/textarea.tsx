import type { TextareaHTMLAttributes } from "react";
import { cn } from "./utils";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
};

/** Textarea shares thesvg's rounded input treatment with optional colocated label text. */
export function Textarea({ className, id, label, ...props }: TextareaProps) {
  const textareaId = id ?? props.name;
  const textarea = <textarea className={cn("ui-textarea", className)} id={textareaId} {...props} />;

  if (!label) {
    return textarea;
  }

  return (
    <label className="ui-input-field" htmlFor={textareaId}>
      <span className="ui-input-label">{label}</span>
      {textarea}
    </label>
  );
}
