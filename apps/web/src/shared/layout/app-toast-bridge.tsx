"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  createToastRecord,
  dismissToastRecord,
  pushToastRecord,
  ToastViewport,
  type ToastInput,
  type ToastRecord
} from "@weopen/ui";

const pendingToastStorageKey = "weopen.pendingToast.v1";

export function queueAppToast(toast: ToastInput) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.sessionStorage.setItem(pendingToastStorageKey, JSON.stringify(toast));
  } catch {
    // Toast delivery must never block the action that triggered it.
  }
}

export function AppToastBridge() {
  const pathname = usePathname();
  const toastIdRef = useRef(0);
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  useEffect(() => {
    const pendingToast = consumePendingToast();

    if (!pendingToast) {
      return;
    }

    toastIdRef.current += 1;
    const nextToast = createToastRecord(pendingToast, toastIdRef.current);
    setToasts((currentToasts) => pushToastRecord(currentToasts, nextToast, 4));
  }, [pathname]);

  return (
    <ToastViewport
      onDismiss={(id) => setToasts((currentToasts) => dismissToastRecord(currentToasts, id))}
      placement="top-right"
      toasts={toasts}
    />
  );
}

function consumePendingToast(): ToastInput | null {
  if (typeof window === "undefined") {
    return null;
  }

  let rawToast: string | null = null;

  try {
    rawToast = window.sessionStorage.getItem(pendingToastStorageKey);
  } catch {
    return null;
  }

  if (!rawToast) {
    return null;
  }

  try {
    window.sessionStorage.removeItem(pendingToastStorageKey);
  } catch {
    return null;
  }

  try {
    const parsedToast = JSON.parse(rawToast) as Partial<ToastInput>;

    if (typeof parsedToast.title !== "string" || parsedToast.title.trim() === "") {
      return null;
    }

    return {
      description: typeof parsedToast.description === "string" ? parsedToast.description : undefined,
      durationMs: typeof parsedToast.durationMs === "number" && Number.isFinite(parsedToast.durationMs)
        ? parsedToast.durationMs
        : undefined,
      title: parsedToast.title,
      tone: isToastTone(parsedToast.tone) ? parsedToast.tone : undefined
    };
  } catch {
    return null;
  }
}

function isToastTone(tone: unknown): tone is ToastInput["tone"] {
  return tone === "neutral" || tone === "success" || tone === "warning" || tone === "danger" || tone === "accent";
}
