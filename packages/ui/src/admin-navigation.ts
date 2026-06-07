export type AdminNavigationItem = {
  href: string;
  label: string;
  description?: string;
  badge?: string;
  order?: number;
  source?: "core" | "plugin";
  tone?: "primary" | "default" | "accent";
};

const coreStart: AdminNavigationItem[] = [
  {
    description: "平台状态、插件指标与近期操作",
    href: "/dashboard",
    label: "Dashboard",
    source: "core",
    tone: "primary"
  },
  {
    description: "Go API health, auth boundary and plugin route status",
    href: "/api",
    label: "API",
    source: "core"
  },
  {
    description: "内置插件、权限与入口",
    href: "/plugins",
    label: "Plugins",
    source: "core"
  }
];

const coreEnd: AdminNavigationItem[] = [
  {
    description: "密钥、环境与平台偏好",
    href: "/settings",
    label: "Settings",
    source: "core"
  },
  {
    description: "Custom React primitives and Nothing tokens",
    href: "/custom-ui",
    label: "Custom UI",
    source: "core"
  }
];

const preferredPluginOrder: Record<string, number> = {
  "/blog": 10,
  "/storage": 20,
  "/domains": 30,
  "/tools": 40
};

export function createAdminNavigation(pluginItems: AdminNavigationItem[] = []): AdminNavigationItem[] {
  const seen = new Set<string>();
  const normalizedPlugins = [...pluginItems]
    .sort((left, right) => sortWeight(left) - sortWeight(right) || left.label.localeCompare(right.label))
    .map((item) => ({
      ...item,
      source: item.source ?? "plugin" as const
    }));

  return [...coreStart, ...normalizedPlugins, ...coreEnd].filter((item) => {
    const href = normalizeHref(item.href);
    if (seen.has(href)) {
      return false;
    }
    seen.add(href);
    return true;
  });
}

function sortWeight(item: AdminNavigationItem): number {
  return preferredPluginOrder[normalizeHref(item.href)] ?? item.order ?? 0;
}

function normalizeHref(href: string): string {
  const trimmed = href.trim();
  return trimmed.endsWith("/") && trimmed !== "/" ? trimmed.slice(0, -1) : trimmed;
}
