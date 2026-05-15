import { AppShell } from "@/shared/layout/app-shell";
import { pluginDashboardWidgets } from "@/plugins/registry";
import { Card } from "@weopen/ui";

export default function DashboardPage() {
  const widgets = pluginDashboardWidgets();

  return (
    <AppShell currentPath="/dashboard">
      <section className="page-header">
        <div className="page-kicker">Dashboard</div>
        <h1 className="page-title">Workspace</h1>
        <p className="page-description">
          The management console now follows the thesvg glass header, rounded sidebar and compact dark information layout while keeping plugin-driven entries.
        </p>
      </section>
      <section className="dashboard-grid" aria-label="Plugin dashboard cards">
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
