"use client";

import { useEffect, useState } from "react";
import type { ButtonProps } from "./button";
import { Button } from "./button";

export const DEFAULT_THEME_STORAGE_KEY = "weopen-theme";

type ThemeName = "light" | "dark";

export type ThemeToggleProps = Omit<ButtonProps, "children"> & {
  defaultTheme?: ThemeName;
  storageKey?: string;
};

export function ThemeToggle({
  defaultTheme,
  storageKey = DEFAULT_THEME_STORAGE_KEY,
  ...props
}: ThemeToggleProps) {
  const [theme, setTheme] = useState<ThemeName>(defaultTheme ?? "dark");

  useEffect(() => {
    const stored = readStoredTheme(storageKey);
    const initialTheme = stored ?? defaultTheme ?? "dark";
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, [defaultTheme, storageKey]);

  function toggleTheme() {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
    try {
      window.localStorage.setItem(storageKey, nextTheme);
    } catch {
      return;
    }
  }

  return (
    <Button
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      isIconOnly
      onPress={toggleTheme}
      variant="secondary"
      {...props}
    >
      {theme === "dark" ? "LT" : "DK"}
    </Button>
  );
}

function readStoredTheme(storageKey: string): ThemeName | null {
  try {
    const stored = window.localStorage.getItem(storageKey);
    return stored === "light" || stored === "dark" ? stored : null;
  } catch {
    return null;
  }
}

function applyTheme(theme: ThemeName) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
}
