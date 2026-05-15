import Link from "next/link";
import { AppShell } from "@/shared/layout/app-shell";
import { pluginManifests } from "@/plugins/registry";
import { Card } from "@weopen/ui";

export default function PluginsPage() {
  return (
    <AppShell currentPath="/plugins">
      <section className="page-header">
        <div className="page-kicker">Plugins</div>
        <h1 className="page-title">Plugin center</h1>
        <p className="page-description">
          Built-in plugin manifests stay compile-time and serializable. Web and Desktop share the shell, base components and SDK while keeping app-specific route adapters.
        </p>
      </section>
      <section className="dashboard-grid" aria-label="Plugin list">
        {pluginManifests.map((manifest) => (
          <Link href={`/plugins/${manifest.id}`} key={manifest.id}>
            <Card description={manifest.description} title={manifest.name}>
              <p className="plugin-card-meta">v{manifest.version}</p>
            </Card>
          </Link>
        ))}
      </section>
    </AppShell>
  );
}
