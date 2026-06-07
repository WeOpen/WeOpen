// Built-in plugin manifests drive web navigation/widgets; backend manifests and permissions remain authoritative.
import type { PluginManifest } from "@weopen/plugin-sdk";

export const builtinPluginManifests: PluginManifest[] = [
  {
    id: "blog",
    name: "Blog",
    description: "管理 Markdown 文章、草稿、标签、分类和发布状态。",
    version: "0.1.0",
    permissions: ["blog:read", "blog:write"],
    nav: [{ title: "Blog", path: "/blog", icon: "file-text", order: 10 }],
    widgets: [
      {
        id: "blog-posts",
        title: "博客文章",
        description: "文章管理插件",
        href: "/blog",
        status: "neutral"
      }
    ]
  },
  {
    id: "devtools",
    name: "Developer Tools",
    description: "Local-first JSON, encoding, time, UUID, JWT, hash, HMAC, and regex utilities.",
    version: "0.1.0",
    permissions: [],
    nav: [{ title: "Tools", path: "/tools", icon: "wrench", order: 20 }],
    widgets: [
      {
        id: "devtools-local",
        title: "Developer tools",
        value: "13",
        description: "Client-safe utilities with no backend round-trip; cron parser deferred.",
        href: "/tools",
        status: "neutral"
      }
    ]
  },
  {
    id: "domains",
    name: "Domains",
    description: "只读同步 Cloudflare 域名、DNS、证书状态和到期提醒；v1 禁用 DNS 写入。",
    version: "0.1.0",
    permissions: ["domain:read"],
    nav: [{ title: "Domains", path: "/domains", icon: "globe", order: 30 }],
    widgets: [
      {
        id: "domains-watch",
        title: "域名监控",
        description: "只读域名、DNS 与证书风险",
        href: "/domains",
        status: "neutral"
      }
    ]
  },
  {
    id: "storage-r2",
    name: "Storage R2",
    description: "管理 R2 对象、博客素材和备份文件。",
    version: "0.1.0",
    permissions: ["storage:read", "storage:write"],
    nav: [{ title: "Storage R2", path: "/storage", icon: "hard-drive", order: 40 }],
    widgets: [
      {
        id: "storage-objects",
        title: "R2 文件",
        description: "对象存储索引和直传",
        href: "/storage",
        status: "neutral"
      }
    ]
  }
];
