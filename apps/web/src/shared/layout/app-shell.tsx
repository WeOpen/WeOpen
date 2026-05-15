import Link from "next/link";
import { AdminShell, ThemeToggle, createAdminNavigation } from "@weopen/ui";
import { pluginNavigation } from "@/plugins/registry";

const navItems = createAdminNavigation(
  pluginNavigation.map((item) => ({
    description: pluginDescription(item.path),
    href: item.path,
    label: item.title,
    order: item.order
  }))
);

/** AppShell composes the shared thesvg-style management shell for Web routes. */
export function AppShell({
  children,
  currentPath
}: Readonly<{ children: React.ReactNode; currentPath?: string }>) {
  return (
    <AdminShell
      appMark="W"
      appName="WeOpen"
      actionSlot={<ThemeToggle />}
      currentPath={currentPath}
      navItems={navItems}
      renderNavItem={(item, className, isActive) => (
        <Link
          aria-current={isActive ? "page" : undefined}
          className={className}
          href={item.href}
        >
          <span>
            <strong>{item.label}</strong>
            {item.description ? <small>{item.description}</small> : null}
          </span>
          {item.badge ? <em>{item.badge}</em> : null}
        </Link>
      )}
      searchPlaceholder="Search plugins, settings, posts, domains..."
      statusLabel={`API: ${process.env.NEXT_PUBLIC_API_BASE_URL ?? "not configured"}`}
      subtitle="Personal Platform"
    >
      {children}
    </AdminShell>
  );
}

function pluginDescription(path: string): string {
  if (path === "/blog") {
    return "Posts, drafts, taxonomy and cover media";
  }
  if (path === "/tools") {
    return "JSON, encoding, time, JWT and regex";
  }
  if (path === "/domains") {
    return "Cloudflare domains and DNS read-only checks";
  }
  if (path === "/storage") {
    return "R2 objects, media and backup files";
  }
  return "Built-in management module";
}
