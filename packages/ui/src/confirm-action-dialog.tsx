"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "./button";

export type ConfirmActionDialogProps = {
  trigger: ReactNode;
  title: ReactNode;
  description: ReactNode;
  confirmLabel?: ReactNode;
  cancelLabel?: ReactNode;
  tone?: "danger" | "warning" | "accent";
  onConfirm: () => void | Promise<void>;
};

export function ConfirmActionDialog({
  cancelLabel = "取消",
  confirmLabel = "确认",
  description,
  onConfirm,
  title,
  tone = "danger",
  trigger
}: ConfirmActionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  async function confirm() {
    setIsPending(true);
    try {
      await onConfirm();
      setIsOpen(false);
    } finally {
      setIsPending(false);
    }
  }

  const dialog = isOpen && isMounted
    ? createPortal(
        <div className="dialog-layer" role="presentation">
          <button aria-label="关闭确认框" className="dialog-backdrop" onClick={() => setIsOpen(false)} type="button" />
          <div aria-modal="true" className={`weopen-confirm-dialog weopen-confirm-dialog--${tone}`} role="dialog">
            <div className="dialog__header">
              <span aria-hidden="true" className="dialog__signal" />
              <h2>{title}</h2>
            </div>
            <p>{description}</p>
            <div className="dialog__footer">
              <Button onPress={() => setIsOpen(false)} type="button" variant="secondary">
                {cancelLabel}
              </Button>
              <Button isPending={isPending} onPress={() => void confirm()} type="button" variant={tone === "danger" ? "danger" : "secondary"}>
                {confirmLabel}
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <span className="confirm-trigger" onClick={() => setIsOpen(true)}>
        {trigger}
      </span>
      {dialog}
    </>
  );
}
