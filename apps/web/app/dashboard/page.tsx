import { AppShell } from "@/components/app-shell";

const cards = [
  {
    title: "博客管理",
    copy: "草稿、发布、标签、封面图和 R2 素材会在这里汇总。"
  },
  {
    title: "程序员工具",
    copy: "JSON、JWT、Base64、时间戳、UUID 等高频工具优先本地运行。"
  },
  {
    title: "域名管理",
    copy: "域名、DNS、SSL 和到期提醒先做只读同步，降低误操作风险。"
  },
  {
    title: "云存储",
    copy: "R2 文件、博客附件、图片素材和备份对象统一管理。"
  }
];

export default function DashboardPage() {
  return (
    <AppShell>
      <section className="page-header">
        <div className="page-kicker">Dashboard</div>
        <h1 className="page-title">工作台</h1>
        <p className="page-description">
          M0 阶段先建立管理台壳，后续插件会把导航、指标和操作入口挂载进来。
        </p>
      </section>
      <section className="dashboard-grid" aria-label="插件占位卡片">
        {cards.map((card) => (
          <article className="dashboard-card" key={card.title}>
            <h2 className="card-title">{card.title}</h2>
            <p className="card-copy">{card.copy}</p>
          </article>
        ))}
      </section>
    </AppShell>
  );
}
