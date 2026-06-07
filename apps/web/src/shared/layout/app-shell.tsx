import { AdminShell, createAdminNavigation } from "@weopen/ui";
import { pluginNavigation } from "@/plugins/registry";

const navItems = createAdminNavigation(
  pluginNavigation.map((item) => ({
    description: pluginDescription(item.path),
    href: item.path,
    label: item.title,
    order: item.order
  }))
);

/** AppShell composes the shared custom Nothing-style management shell for Web routes. */
export function AppShell({
  children,
  currentPath
}: Readonly<{ children: React.ReactNode; currentPath?: string }>) {
  return (
    <AdminShell
      appMark="W"
      appName="WeOpen"
      currentPath={currentPath}
      navItems={navItems}
      statusLabel="READ ONLY"
      subtitle="Personal Management Platform"
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
