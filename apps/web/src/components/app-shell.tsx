import Link from "next/link";

const navItems = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/blog", label: "博客" },
  { href: "/tools", label: "工具箱" },
  { href: "/domains", label: "域名" },
  { href: "/storage", label: "云存储" },
  { href: "/plugins", label: "插件" },
  { href: "/settings", label: "设置" }
];

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-title">WeOpen</div>
          <div className="brand-subtitle">Personal Platform</div>
        </div>
        <nav className="nav-list" aria-label="主导航">
          {navItems.map((item) => (
            <Link className="nav-link" href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="main-area">
        <header className="topbar">
          <div className="topbar-title">个人管理平台</div>
          <div className="topbar-status">API: {process.env.NEXT_PUBLIC_API_BASE_URL ?? "未配置"}</div>
        </header>
        <main className="page">{children}</main>
      </div>
    </div>
  );
}
