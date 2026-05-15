import { Fragment, type ReactNode } from "react";
import type { AdminNavigationItem } from "./admin-navigation";

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
  renderNavItem?: (
    item: AdminNavigationItem,
    className: string,
    isActive: boolean
  ) => ReactNode;
};

export function AdminShell({
  actionSlot,
  appMark,
  appName,
  brandHref = "/dashboard",
  children,
  currentPath,
  navItems,
  renderNavItem,
  searchPlaceholder = "Search modules, plugins, settings...",
  statusLabel,
  subtitle
}: AdminShellProps) {
  return (
    <div className="admin-theme admin-shell">
      <header className="admin-header">
        <div className="admin-header-inner">
          <a className="admin-brand" href={brandHref}>
            <span className="admin-brand-mark" aria-hidden="true">
              {appMark ?? "W"}
            </span>
            <span>
              <span className="admin-brand-title">{appName}</span>
              <span className="admin-brand-subtitle">{subtitle}</span>
            </span>
          </a>
          <div className="admin-search" role="search">
            <span aria-hidden="true">⌘</span>
            <input aria-label="Search" placeholder={searchPlaceholder} readOnly />
            <kbd>Ctrl K</kbd>
          </div>
          <div className="admin-header-actions">
            {statusLabel ? <span className="admin-status">{statusLabel}</span> : null}
            {actionSlot}
          </div>
        </div>
      </header>

      <aside className="admin-sidebar" aria-label="Management navigation">
        <nav className="admin-nav">
          {navItems.map((item) => {
            const isActive = isActivePath(currentPath, item.href);
            const className = [
              "admin-nav-link",
              isActive ? "admin-nav-link-active" : "",
              item.tone === "primary" ? "admin-nav-link-primary" : "",
              item.tone === "accent" ? "admin-nav-link-accent" : ""
            ]
              .filter(Boolean)
              .join(" ");

            if (renderNavItem) {
              return <Fragment key={item.href}>{renderNavItem(item, className, isActive)}</Fragment>;
            }

            return (
              <a
                aria-current={isActive ? "page" : undefined}
                className={className}
                href={item.href}
                key={item.href}
              >
                <span>
                  <strong>{item.label}</strong>
                  {item.description ? <small>{item.description}</small> : null}
                </span>
                {item.badge ? <em>{item.badge}</em> : null}
              </a>
            );
          })}
        </nav>
        <div className="admin-sidebar-footer">
          <span>Shared shell</span>
          <strong>Web + Desktop</strong>
        </div>
      </aside>

      <main className="admin-main">
        <div className="admin-main-inner">{children}</div>
      </main>
    </div>
  );
}

function isActivePath(currentPath = "", href: string): boolean {
  if (!currentPath) {
    return false;
  }
  if (href === "/dashboard") {
    return currentPath === "/" || currentPath === "/dashboard";
  }
  return currentPath === href || currentPath.startsWith(`${href}/`);
}
