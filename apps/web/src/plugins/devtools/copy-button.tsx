"use client";

import { useState } from "react";
import { Button } from "@weopen/ui";

export function CopyButton({
  disabled,
  value
}: {
  disabled?: boolean;
  value: string;
}) {
  const [label, setLabel] = useState("Copy");

  async function copy() {
    if (!value || disabled) {
      return;
    }
    await navigator.clipboard.writeText(value);
    setLabel("Copied");
    window.setTimeout(() => setLabel("Copy"), 1200);
  }

  return (
    <Button disabled={disabled || !value} onPress={copy} variant="secondary">
      {label}
    </Button>
  );
}
