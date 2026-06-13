"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { AdminNavigationItem } from "./admin-navigation";
import { Button } from "./button";
import { Chip } from "./chip";
import { PixelIcon } from "./pixel-icon";
import { ScrollRail } from "./scroll-rail";
import { cn } from "./utils";

export type AdminShellProps = {
  appName: string;
  appMark?: ReactNode;
  brandHref?: string;
  subtitle: string;
  currentPath?: string;
  environmentLabel?: string;
  navItems: AdminNavigationItem[];
  statusLabel?: string;
  searchPlaceholder?: string;
  runtimeLabel?: string;
  versionLabel?: string;
  actionSlot?: ReactNode;
  footerActionSlot?: ReactNode;
  children: ReactNode;
  onNavItemSelect?: (item: AdminNavigationItem) => void;
};

type SystemClockState = {
  label: string;
  now: Date;
  timeZone?: string;
};

const navItemTransition = { duration: 0.15, ease: "easeOut" } as const;
const navSweepTransition = { duration: 0.28, ease: [0.16, 1, 0.3, 1] } as const;
const navGlyphTransition = { duration: 0.18, ease: "easeOut" } as const;

const navItemVariants = {
  active: { backgroundColor: "#181818", borderLeftColor: "var(--accent)", color: "var(--text-display)", x: 0 },
  idle: { backgroundColor: "rgba(0, 0, 0, 0)", borderLeftColor: "rgba(0, 0, 0, 0)", color: "var(--text-primary)", x: 0 },
  hover: { backgroundColor: "#181818", borderLeftColor: "var(--accent)", color: "var(--text-display)", x: 2 }
} as const;

const navSweepVariants = {
  active: { opacity: 0.16, x: "0%" },
  idle: { opacity: 0, x: "-120%" },
  hover: { opacity: 0.38, x: "120%" }
} as const;

export function AdminShell({
  actionSlot,
  appName,
  brandHref = "/dashboard",
  children,
  currentPath,
  environmentLabel = "LOCAL",
  footerActionSlot,
  navItems,
  onNavItemSelect,
  runtimeLabel = "BROWSER",
  statusLabel,
  versionLabel = "0.1.0"
}: AdminShellProps) {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [systemClock, setSystemClock] = useState<SystemClockState | null>(null);
  const mainScrollRef = useRef<HTMLElement>(null);
  const settingsHref = hrefForNavItem(navItems, "/settings", "#settings");

  useEffect(() => {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
    const label = timeZone ?? "Local";
    const syncSystemTime = () => setSystemClock({ label, now: new Date(), timeZone });
    const initialTimer = window.setTimeout(syncSystemTime, 0);
    const timer = window.setInterval(syncSystemTime, 1000);
    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, []);

  const systemTimeDisplay = systemClock ? formatUserTimeDisplay(systemClock.now, systemClock.label, systemClock.timeZone) : null;

  return (
    <div className="weopen-admin-shell">
      <ScrollRail containerRef={mainScrollRef} />

      <aside aria-label="管理导航" className="weopen-admin-sidebar">
        <NavigationPanel
          appName={appName}
          brandHref={brandHref}
          currentPath={currentPath}
          navItems={navItems}
          onNavItemSelect={onNavItemSelect}
          settingsHref={settingsHref}
          footerActionSlot={footerActionSlot}
        />
      </aside>

      {isNavOpen ? (
        <div className="mobile-nav-layer" role="presentation">
          <button aria-label="关闭导航" className="mobile-nav-backdrop" onClick={() => setIsNavOpen(false)} type="button" />
          <div className="mobile-nav-dialog" role="dialog" aria-modal="true" aria-label="WeOpen 导航">
            <div className="mobile-nav-header">
              <span>WeOpen 导航</span>
              <Button aria-label="关闭导航" isIconOnly onPress={() => setIsNavOpen(false)} variant="ghost">
                <PixelIcon name="close" variant="bare" />
              </Button>
            </div>
            <NavigationPanel
              appName={appName}
              brandHref={brandHref}
              currentPath={currentPath}
              isDrawer
              navItems={navItems}
              onNavItemSelect={(item) => {
                onNavItemSelect?.(item);
                setIsNavOpen(false);
              }}
              settingsHref={settingsHref}
              footerActionSlot={footerActionSlot}
            />
          </div>
        </div>
      ) : null}

      <main className="weopen-admin-main" ref={mainScrollRef}>
        <header
          className={cn("weopen-admin-topbar", {
            "weopen-admin-topbar-has-mode": Boolean(statusLabel),
            "weopen-admin-topbar-has-slot": Boolean(actionSlot)
          })}
          aria-label="System status"
        >
          <div className="weopen-admin-topbar-mobile-nav">
            <Button
              aria-label="打开导航"
              className="weopen-mobile-nav-trigger"
              isIconOnly
              onPress={() => setIsNavOpen(true)}
              variant="secondary"
            >
              <PixelIcon name="menu" variant="bare" />
            </Button>
          </div>
          <div className="weopen-admin-topbar-time">
            <span>SYSTEM TIME</span>
            <strong className="weopen-admin-topbar-time-value">
              {systemTimeDisplay ? (
                <>
                  <time dateTime={systemClock?.now.toISOString()}>{systemTimeDisplay.time}</time>
                  <small>{systemTimeDisplay.timeZone}</small>
                </>
              ) : (
                <>
                  <span>Detecting time</span>
                  <small>Detecting timezone</small>
                </>
              )}
            </strong>
          </div>
          <div className="weopen-admin-topbar-meta">
            <span>ENV</span>
            <strong>{environmentLabel}</strong>
          </div>
          <div className="weopen-admin-topbar-meta">
            <span>RUNTIME</span>
            <strong>{runtimeLabel}</strong>
          </div>
          <div className="weopen-admin-topbar-meta">
            <span>VERSION</span>
            <strong>{versionLabel}</strong>
          </div>
          {statusLabel ? (
            <div className="weopen-admin-topbar-mode">
              {statusLabel}
            </div>
          ) : null}
          {actionSlot ? <div className="weopen-admin-topbar-slot">{actionSlot}</div> : null}
        </header>

        <div className="weopen-admin-content">{children}</div>
      </main>
    </div>
  );
}

function formatUserTimeDisplay(date: Date, label: string, timeZone?: string): { time: string; timeZone: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hourCycle: "h23",
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    ...(timeZone ? { timeZone } : {}),
    year: "numeric"
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));

  return {
    time: `${values.get("year") ?? "0000"}-${values.get("month") ?? "00"}-${values.get("day") ?? "00"} ${values.get("hour") ?? "00"}:${values.get("minute") ?? "00"}:${values.get("second") ?? "00"}`,
    timeZone: label
  };
}

function NavigationPanel({
  appName,
  brandHref,
  currentPath,
  isDrawer,
  navItems,
  onNavItemSelect,
  settingsHref,
  footerActionSlot
}: {
  appName: string;
  brandHref: string;
  currentPath?: string;
  isDrawer?: boolean;
  navItems: AdminNavigationItem[];
  onNavItemSelect?: (item: AdminNavigationItem) => void;
  settingsHref?: string;
  footerActionSlot?: ReactNode;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <div className={cn("weopen-admin-nav-card", { "weopen-admin-nav-card-drawer": isDrawer })}>
      <a className="weopen-admin-brand" href={brandHref}>
        <strong>{appName.toUpperCase()}</strong>
      </a>

      <div className="weopen-admin-nav-scroll">
        <nav className="weopen-admin-nav-list">
          {navItems.map((item) => {
            const isActive = isActivePath(currentPath, item.href);
            const glyphVariants = createNavGlyphVariants();
            const glyph = (
              <motion.span
                animate={onNavItemSelect ? (isActive ? "active" : "idle") : undefined}
                aria-hidden="true"
                className={navGlyphClassName(item)}
                initial={false}
                transition={shouldReduceMotion ? { duration: 0 } : navGlyphTransition}
                variants={glyphVariants}
              >
                <PixelIcon name={pixelIconNameForItem(item)} />
              </motion.span>
            );

            if (onNavItemSelect) {
              return (
                <Button
                  aria-current={isActive ? "page" : undefined}
                  className={cn("weopen-admin-nav-item", { "weopen-admin-nav-item-active": isActive })}
                  fullWidth
                  key={item.href}
                  onPress={() => onNavItemSelect(item)}
                  variant="ghost"
                >
                  {glyph}
                  <span>{item.label}</span>
                  {item.badge ? <Chip size="sm" variant="outline">{item.badge}</Chip> : null}
                </Button>
              );
            }

            return (
              <motion.a
                animate={isActive ? "active" : "idle"}
                aria-current={isActive ? "page" : undefined}
                className={cn("weopen-admin-nav-item", { "weopen-admin-nav-item-active": isActive })}
                href={item.href}
                key={item.href}
                initial={false}
                transition={shouldReduceMotion ? { duration: 0 } : navItemTransition}
                variants={navItemVariants}
                whileFocus={isActive ? "active" : "hover"}
                whileHover={isActive ? "active" : "hover"}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.99, x: 4 }}
              >
                <motion.span
                  aria-hidden="true"
                  className="weopen-admin-nav-sweep"
                  transition={shouldReduceMotion ? { duration: 0 } : navSweepTransition}
                  variants={navSweepVariants}
                />
                {glyph}
                <span>{item.label}</span>
                {item.badge ? <Chip size="sm" variant="outline">{item.badge}</Chip> : null}
              </motion.a>
            );
          })}
        </nav>
      </div>

      <footer className={cn("weopen-admin-nav-footer", { "weopen-admin-nav-footer-with-action": Boolean(footerActionSlot) })}>
        <a className="weopen-admin-nav-footer-link" href={settingsHref ?? brandHref}>
          <PixelIcon name="status" />
          <strong>WEOPEN ADMIN</strong>
          <small>ADMIN</small>
        </a>
        {footerActionSlot ? <div className="weopen-admin-nav-footer-action">{footerActionSlot}</div> : null}
      </footer>
    </div>
  );
}

function navGlyphClassName(item: AdminNavigationItem): string {
  const routeName = item.href.replace(/^[/#]+/, "").replace(/[^a-z0-9-]+/gi, "-") || "root";

  return cn("weopen-admin-nav-glyph", `weopen-admin-nav-glyph-${routeName}`);
}

function createNavGlyphVariants() {
  return {
    active: { color: "var(--accent)", x: 3 },
    idle: { color: "var(--text-display)", x: 0 },
    hover: { color: "var(--accent)", x: 4 }
  } as const;
}

function pixelIconNameForItem(item: AdminNavigationItem): string {
  const routeName = item.href.replace(/^[/#]+/, "").split("/")[0] || "fallback";

  if (item.href.includes("storage")) {
    return "storage";
  }
  return item.source === "plugin" && routeName === "fallback" ? "plugins" : routeName;
}

function hrefForNavItem(navItems: AdminNavigationItem[], path: string, hash: string): string | undefined {
  return navItems.find((item) => item.href === path || item.href === hash)?.href;
}

function isActivePath(currentPath = "", href: string): boolean {
  if (!currentPath) {
    return false;
  }
  if (href === "/dashboard" || href === "#dashboard") {
    return currentPath === "/" || currentPath === "/dashboard" || currentPath === "#dashboard";
  }
  return currentPath === href || currentPath.startsWith(`${href}/`);
}
