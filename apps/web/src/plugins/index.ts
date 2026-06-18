// Built-in plugin manifests drive web navigation/widgets; backend manifests and permissions remain authoritative.
import { definePluginManifest } from "@weopen/plugin-sdk";
import type { PluginManifest } from "@weopen/plugin-sdk";

export const builtinPluginManifests: PluginManifest[] = [
  definePluginManifest({
    id: "blog",
    name: "Blog",
    description: "Manage Markdown posts, drafts, tags, categories, and publishing state.",
    version: "0.1.0",
    permissions: ["blog:read", "blog:write"],
    nav: [{ title: "Blog", path: "/blog", icon: "blog", order: 10 }],
    widgets: [
      {
        id: "blog-posts",
        title: "Blog Posts",
        description: "Post management plugin",
        href: "/blog",
        status: "neutral"
      }
    ]
  }),
  definePluginManifest({
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
  }),
  definePluginManifest({
    id: "domains",
    name: "Domains",
    description: "Read-only Cloudflare domain, DNS, certificate status, and expiration monitoring; DNS writes are disabled in v1.",
    version: "0.1.0",
    permissions: ["domain:read", "domain:write"],
    nav: [{ title: "Domains", path: "/domains", icon: "domains", order: 30 }],
    widgets: [
      {
        id: "domains-watch",
        title: "Domain Monitor",
        description: "Read-only domain, DNS, and certificate risk",
        href: "/domains",
        status: "neutral"
      }
    ]
  }),
  definePluginManifest({
    id: "storage-r2",
    name: "Storage R2",
    description: "Manage R2 objects, blog media, and backup files.",
    version: "0.1.0",
    permissions: ["storage:read", "storage:write"],
    nav: [{ title: "Storage R2", path: "/storage", icon: "storage", order: 40 }],
    widgets: [
      {
        id: "storage-objects",
        title: "R2 Files",
        description: "Object index and direct uploads",
        href: "/storage",
        status: "neutral"
      }
    ]
  })
];
