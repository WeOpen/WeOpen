"use client";

import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef, useState, type ReactNode } from "react";
import type { AdminNavigationItem } from "./admin-navigation";
import { Button } from "./button";
import { Chip } from "./chip";
import { cn } from "./utils";

export type AdminShellProps = {
  appName: string;
  appMark?: ReactNode;
  brandHref?: string;
  subtitle: string;
  currentPath?: string;
  navItems: AdminNavigationItem[];
  statusLabel?: string;
  searchPlaceholder?: string;
  actionSlot?: ReactNode;
  children: ReactNode;
  onNavItemSelect?: (item: AdminNavigationItem) => void;
};

const glyphByHref: Record<string, string> = {
  "/api": ">_",
  "/blog": "▤",
  "/custom-ui": "□",
  "/dashboard": "▦",
  "/domains": "◎",
  "/plugins": "✣",
  "/settings": "⚙",
  "/storage": "◉",
  "/tools": "<>"
};

const systemTime = "2025-05-20 14:37:11 UTC";

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
  navItems,
  onNavItemSelect,
  statusLabel
}: AdminShellProps) {
  const [isNavOpen, setIsNavOpen] = useState(false);
  const mainScrollRef = useRef<HTMLElement>(null);
  const settingsHref = hrefForNavItem(navItems, "/settings", "#settings");
  const { scrollYProgress } = useScroll({ container: mainScrollRef });
  const scrollRailProgress = useSpring(useTransform(scrollYProgress, [0, 1], [0.08, 1]), {
    damping: 28,
    mass: 0.2,
    stiffness: 120
  });

  return (
    <div className="weopen-admin-shell">
      <div className="weopen-scroll-rail" aria-hidden="true">
        <motion.div className="weopen-scroll-rail-progress" style={{ scaleY: scrollRailProgress }} />
      </div>

      <aside aria-label="管理导航" className="weopen-admin-sidebar">
        <NavigationPanel
          appName={appName}
          brandHref={brandHref}
          currentPath={currentPath}
          navItems={navItems}
          onNavItemSelect={onNavItemSelect}
          settingsHref={settingsHref}
        />
      </aside>

      {isNavOpen ? (
        <div className="mobile-nav-layer" role="presentation">
          <button aria-label="关闭导航" className="mobile-nav-backdrop" onClick={() => setIsNavOpen(false)} type="button" />
          <div className="mobile-nav-dialog" role="dialog" aria-modal="true" aria-label="WeOpen 导航">
            <div className="mobile-nav-header">
              <span>WeOpen 导航</span>
              <Button isIconOnly onPress={() => setIsNavOpen(false)} variant="ghost">×</Button>
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
            />
          </div>
        </div>
      ) : null}

      <main className="weopen-admin-main" ref={mainScrollRef}>
        <header className="weopen-admin-topbar" aria-label="System status">
          <div className="weopen-admin-topbar-command">
            <Button
              aria-label="打开导航"
              className="weopen-mobile-nav-trigger"
              isIconOnly
              onPress={() => setIsNavOpen(true)}
              variant="secondary"
            >
              ≡
            </Button>
            <span>COMMAND CENTER</span>
            <strong><span aria-hidden="true">●</span> ONLINE</strong>
          </div>
          <div className="weopen-admin-topbar-time">
            <span>SYSTEM TIME</span>
            <strong>{systemTime}</strong>
          </div>
          <div className="weopen-admin-topbar-meta">
            <span>ENV</span>
            <strong>PRODUCTION</strong>
          </div>
          <div className="weopen-admin-topbar-meta">
            <span>REGION</span>
            <strong>GLOBAL</strong>
          </div>
          <div className="weopen-admin-topbar-meta">
            <span>VERSION</span>
            <strong>v1.2.0</strong>
          </div>
          <div className="weopen-admin-topbar-mode">
            {statusLabel ?? "LOCAL MODE"}
          </div>
          <div className="weopen-admin-topbar-slot">{actionSlot}</div>
        </header>

        <div className="weopen-admin-content">{children}</div>
      </main>
    </div>
  );
}

function NavigationPanel({
  appName,
  brandHref,
  currentPath,
  isDrawer,
  navItems,
  onNavItemSelect,
  settingsHref
}: {
  appName: string;
  brandHref: string;
  currentPath?: string;
  isDrawer?: boolean;
  navItems: AdminNavigationItem[];
  onNavItemSelect?: (item: AdminNavigationItem) => void;
  settingsHref?: string;
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
            const glyphVariants = createNavGlyphVariants(item);
            const glyph = (
              <motion.span
                aria-hidden="true"
                className={navGlyphClassName(item)}
                transition={shouldReduceMotion ? { duration: 0 } : navGlyphTransition}
                variants={glyphVariants}
              >
                {glyphForItem(item)}
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

      <footer className="weopen-admin-nav-footer">
        <a href={settingsHref ?? brandHref}>
          <span aria-hidden="true">●</span>
          <strong>WEOPEN ADMIN</strong>
          <small>ADMIN</small>
        </a>
      </footer>
    </div>
  );
}

function glyphForItem(item: AdminNavigationItem): string {
  if (glyphByHref[item.href]) {
    return glyphByHref[item.href];
  }
  if (item.href.includes("storage")) {
    return "R2";
  }
  return item.source === "plugin" ? "PLG" : "●";
}

function navGlyphClassName(item: AdminNavigationItem): string {
  const routeName = item.href.replace(/^[/#]+/, "").replace(/[^a-z0-9-]+/gi, "-") || "root";

  return cn("weopen-admin-nav-glyph", `weopen-admin-nav-glyph-${routeName}`);
}

function createNavGlyphVariants(item: AdminNavigationItem) {
  const scale = item.href === "/api" || item.href === "/tools" ? 0.76 : 1;

  return {
    active: { color: "var(--accent)", rotate: 4, scale, x: 3 },
    idle: { color: "var(--text-display)", rotate: 0, scale, x: 0 },
    hover: { color: "var(--accent)", rotate: -6, scale, x: 4 }
  } as const;
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
