"use client";

import { useEffect, useState, type ButtonHTMLAttributes } from "react";
import { cn } from "./utils";

export const DEFAULT_THEME_STORAGE_KEY = "weopen-theme";

type ThemeName = "light" | "dark";

export type ThemeToggleProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  defaultTheme?: ThemeName;
  storageKey?: string;
};

/** ThemeToggle applies thesvg-compatible light/dark classes to the document root. */
export function ThemeToggle({
  className,
  defaultTheme = "dark",
  storageKey = DEFAULT_THEME_STORAGE_KEY,
  type = "button",
  ...props
}: ThemeToggleProps) {
  const [theme, setTheme] = useState<ThemeName>(defaultTheme);

  useEffect(() => {
    const stored = readStoredTheme(storageKey);
    const initialTheme = stored ?? defaultTheme;
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
      // Ignore blocked storage; the class still updates for this session.
    }
  }

  return (
    <button
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
      className={cn("ui-button ui-button-outline ui-theme-toggle", className)}
      data-theme-toggle=""
      onClick={toggleTheme}
      title={`Current theme: ${theme}`}
      type={type}
      {...props}
    >
      <span aria-hidden="true" className="ui-theme-toggle-icon ui-theme-toggle-light">
        ☀
      </span>
      <span aria-hidden="true" className="ui-theme-toggle-icon ui-theme-toggle-dark">
        ◐
      </span>
    </button>
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
