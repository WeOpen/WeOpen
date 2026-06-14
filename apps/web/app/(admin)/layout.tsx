import type { ReactNode } from "react";
import { AppShell } from "@/shared/layout/app-shell";

/**
 * Persistent shell for all authenticated admin routes. Rendering AppShell here
 * (instead of inside each page) keeps the sidebar mounted across navigations,
 * so route changes swap only the main content — no remount, refetch, or flash.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
