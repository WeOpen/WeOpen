"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { PixelIcon } from "./pixel-icon";
import type { ToastRecord } from "./toast-state";
import { cn } from "./utils";

export type ToastProps = {
  onDismiss?: (id: string) => void;
  toast: ToastRecord;
};

export type ToastViewportProps = {
  className?: string;
  onDismiss?: (id: string) => void;
  placement?: "bottom-right" | "top-right";
  toasts: ToastRecord[];
};

export function Toast({ onDismiss, toast }: ToastProps) {
  return (
    <div className={cn("weopen-toast", `weopen-toast--${toast.tone}`)} role="status">
      <span aria-hidden="true" className="weopen-toast__signal" />
      <div className="weopen-toast__copy">
        <strong>{toast.title}</strong>
        {toast.description ? <p>{toast.description}</p> : null}
      </div>
      <button aria-label="Dismiss notification" onClick={() => onDismiss?.(toast.id)} type="button">
        <PixelIcon name="close" variant="bare" />
      </button>
    </div>
  );
}

export function ToastViewport({
  className,
  onDismiss,
  placement = "bottom-right",
  toasts
}: ToastViewportProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!onDismiss || toasts.length === 0) {
      return;
    }

    const timers = toasts.map((toast) => {
      return window.setTimeout(() => onDismiss(toast.id), toast.durationMs);
    });

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [onDismiss, toasts]);

  if (!isMounted || toasts.length === 0) {
    return null;
  }

  return createPortal(
    <div
      aria-label="Notifications"
      className={cn("weopen-toast-viewport", `weopen-toast-viewport--${placement}`, className)}
      role="region"
    >
      {toasts.map((toast) => (
        <Toast key={toast.id} onDismiss={onDismiss} toast={toast} />
      ))}
    </div>,
    document.body
  );
}
