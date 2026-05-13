import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page">
      <section className="page-header">
        <div className="page-kicker">WeOpen</div>
        <h1 className="page-title">个人管理平台</h1>
        <p className="page-description">
          用一个低成本、插件化的平台管理博客、开发工具、域名、云存储和个人数据。
        </p>
      </section>
      <Link className="nav-link" href="/dashboard">
        进入 Dashboard
      </Link>
    </main>
  );
}
