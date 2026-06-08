import Link from "next/link";
import { AppShell } from "@/shared/layout/app-shell";
import { Card, MetricCard, PageHeader } from "@weopen/ui";

export default function HomePage() {
  return (
    <AppShell currentPath="/dashboard">
      <section className="admin-hero">
        <Card className="admin-hero-panel">
          <Card.Content>
            <PageHeader
              eyebrow="WeOpen Admin"
              title="你的个人平台，从一个指挥舱开始。"
              description="管理博客内容、开发者工具、域名、R2 存储和平台设置。Web 与 Desktop 共用基础组件和插件协议，但每个界面都为日常管理优化。"
            />
          </Card.Content>
          <div className="admin-hero-actions">
            <Link className="ui-button ui-button-primary" href="/dashboard">
              打开 Dashboard
            </Link>
            <Link className="ui-button ui-button-secondary" href="/plugins">
              查看插件
            </Link>
          </div>
        </Card>
        <div className="admin-stat-list">
          <MetricCard icon={<span>PL</span>} label="Built-in plugins" value="4" description="博客、工具、域名和云存储" />
          <MetricCard icon={<span>UI</span>} label="Design system" value="Custom UI" description="Nothing tokens + 自定义组件" />
          <MetricCard icon={<span>SDK</span>} label="Shared shell" value="Web/Desktop" description="组件、SDK 和 tokens 复用" />
        </div>
      </section>
    </AppShell>
  );
}
