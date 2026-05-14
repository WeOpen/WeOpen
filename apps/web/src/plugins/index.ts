// Built-in plugin manifests drive web navigation/widgets; backend manifests and permissions remain authoritative.
import type { PluginManifest } from "@weopen/plugin-sdk";

export const builtinPluginManifests: PluginManifest[] = [
  {
    id: "blog",
    name: "博客管理",
    description: "管理 Markdown 文章、草稿、标签、分类和发布状态。",
    version: "0.1.0",
    permissions: ["blog:read", "blog:write"],
    nav: [{ title: "博客", path: "/blog", icon: "file-text", order: 10 }],
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
    name: "程序员工具",
    description: "提供 JSON、JWT、Base64、时间戳等常用工具。",
    version: "0.1.0",
    permissions: [],
    nav: [{ title: "工具箱", path: "/tools", icon: "wrench", order: 20 }],
    widgets: [
      {
        id: "devtools-local",
        title: "工具箱",
        description: "本地优先工具插件占位",
        href: "/tools",
        status: "neutral"
      }
    ]
  },
  {
    id: "domains",
    name: "域名管理",
    description: "同步域名、DNS、证书状态和到期提醒。",
    version: "0.1.0",
    permissions: ["domain:read"],
    nav: [{ title: "域名", path: "/domains", icon: "globe", order: 30 }],
    widgets: [
      {
        id: "domains-watch",
        title: "域名监控",
        description: "只读域名同步插件占位",
        href: "/domains",
        status: "neutral"
      }
    ]
  },
  {
    id: "storage-r2",
    name: "云存储",
    description: "管理 R2 对象、博客素材和备份文件。",
    version: "0.1.0",
    permissions: ["storage:read", "storage:write"],
    nav: [{ title: "云存储", path: "/storage", icon: "hard-drive", order: 40 }],
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
