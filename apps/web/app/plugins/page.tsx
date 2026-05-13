import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { pluginManifests } from "@/plugins/registry";
import { Card } from "@weopen/ui";

export default function PluginsPage() {
  return (
    <AppShell>
      <section className="page-header">
        <div className="page-kicker">Plugins</div>
        <h1 className="page-title">插件</h1>
        <p className="page-description">
          M2 阶段展示编译期内置插件。启停状态以后会从 API manifest 同步。
        </p>
      </section>
      <section className="dashboard-grid" aria-label="插件列表">
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
