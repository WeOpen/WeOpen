import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "./utils";

export type AlertStatus = "default" | "accent" | "success" | "warning" | "danger";

export type AlertProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
  status?: AlertStatus;
};

function AlertRoot({ children, className, status = "default", ...props }: AlertProps) {
  return (
    <div className={cn("alert", `alert--${status}`, className)} role="status" {...props}>
      {children}
    </div>
  );
}

function AlertContent({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("alert__content", className)} {...props}>
      {children}
    </div>
  );
}

function AlertDescription({ children, className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("alert__description", className)} {...props}>
      {children}
    </p>
  );
}

export const Alert = Object.assign(AlertRoot, {
  Content: AlertContent,
  Description: AlertDescription
});
