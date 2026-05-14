import { AppShell } from "@/shared/layout/app-shell";
import { pluginDashboardWidgets } from "@/plugins/registry";
import { Card } from "@weopen/ui";

export default function DashboardPage() {
  const widgets = pluginDashboardWidgets();

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
        {widgets.map((widget) => (
          <Card
            description={`${widget.pluginName} - ${widget.description ?? ""}`}
            key={`${widget.pluginId}:${widget.id}`}
            title={widget.title}
          />
        ))}
      </section>
    </AppShell>
  );
}
