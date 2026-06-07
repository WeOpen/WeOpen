import { AppShell } from "@/shared/layout/app-shell";
import { pluginManifests } from "@/plugins/registry";
import { Card, Button } from "@weopen/ui";

const inspector = {
  id: "blog",
  name: "Blog",
  version: pluginManifests.find((manifest) => manifest.id === "blog")?.version ?? "unknown",
  description: "Blog engine with posts, categories, tags.",
  entry: "github.com/weopen/plugins/blog",
  type: "plugin",
  enabled: true
};

const permissions = [
  ["READ_FS", "true"],
  ["WRITE_FS", "false"],
  ["NET_REQUEST", "true"],
  ["ENV_ACCESS", "false"],
  ["EXEC_COMMAND", "false"]
];

export default function PluginsPage() {
  return (
    <AppShell currentPath="/plugins">
      <section className="plugin-registry-page">
        <div className="plugin-registry-main">
          <div className="plugin-registry-hero">
            <span>Plugin Registry</span>
            <h1><strong>04</strong> Modules</h1>
            <p>Compile-time registry • deterministic order • static manifests</p>
          </div>

          <section className="plugin-grid" aria-label="Plugin list">
            {pluginManifests.map((manifest, index) => (
              <a className="plugin-card-link" href={`/plugins/${manifest.id}`} key={manifest.id}>
                <Card className={index === 0 ? "plugin-card plugin-card-active" : "plugin-card"}>
                  <Card.Header>
                    <span className="plugin-card-icon">{iconForPlugin(manifest.id)}</span>
                    <div>
                      <Card.Title>{displayName(manifest.id, manifest.name)}</Card.Title>
                      <Card.Description>{englishDescription(manifest.id, manifest.description ?? "")}</Card.Description>
                    </div>
                    {index === 0 ? <span className="plugin-card-check">●</span> : null}
                  </Card.Header>
                  <Card.Content>
                    <dl className="plugin-card-specs">
                      <div><dt>Version</dt><dd>{manifest.version}</dd></div>
                      <div><dt>Route Prefix</dt><dd>{manifest.nav?.[0]?.path ?? "/plugins"}</dd></div>
                      <div><dt>Widgets</dt><dd>{manifest.widgets?.length ?? 0}</dd></div>
                      <div><dt>Order</dt><dd>{String(index + 1).padStart(2, "0")}</dd></div>
                    </dl>
                  </Card.Content>
                  <Card.Footer><span>Enabled</span><i /></Card.Footer>
                </Card>
              </a>
            ))}
          </section>
        </div>

        <aside className="plugin-inspector" aria-label="Manifest inspector">
          <Button fullWidth variant="secondary">↻ Scan Registry</Button>
          <p>Last scan&nbsp;&nbsp; 2025-05-20 14:37:11 UTC</p>
          <Card>
            <Card.Header>
              <Card.Title>Manifest Inspector</Card.Title>
              <span className="inspector-order">● ORDER 01 / 04</span>
            </Card.Header>
            <Card.Content>
              <pre>{JSON.stringify(inspector, null, 2)}</pre>
            </Card.Content>
          </Card>
          <Card>
            <Card.Header><Card.Title>Permissions</Card.Title></Card.Header>
            <Card.Content className="plugin-inspector-list">
              {permissions.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
            </Card.Content>
          </Card>
          <Card>
            <Card.Header><Card.Title>Routes</Card.Title></Card.Header>
            <Card.Content className="plugin-inspector-list">
              <div><span>/blog</span><strong>PUBLIC</strong></div>
              <div><span>/blog/posts/:slug</span><strong>PUBLIC</strong></div>
              <div><span>/blog/api/*</span><strong>PUBLIC</strong></div>
            </Card.Content>
          </Card>
          <Card>
            <Card.Header><Card.Title>Dashboard Widgets</Card.Title></Card.Header>
            <Card.Content className="plugin-inspector-list">
              <div><span>blog.recent_posts</span><strong>SMALL</strong></div>
              <div><span>blog.stats</span><strong>SMALL</strong></div>
              <div><span>blog.activity</span><strong>MEDIUM</strong></div>
            </Card.Content>
          </Card>
        </aside>
      </section>
    </AppShell>
  );
}

function displayName(pluginId: string, fallback: string) {
  const names: Record<string, string> = {
    blog: "Blog",
    devtools: "DevTools",
    domains: "Domains",
    "storage-r2": "Storage-R2"
  };
  return names[pluginId] ?? fallback;
}

function englishDescription(pluginId: string, fallback: string) {
  const descriptions: Record<string, string> = {
    blog: "Blog engine with posts, categories, tags, and feeds.",
    devtools: "Developer tools, system inspector, and runtime utilities.",
    domains: "Domains overview and TLS certificate inspection (read-only).",
    "storage-r2": "Cloud storage adapter for Cloudflare R2 bucket operations."
  };
  return descriptions[pluginId] ?? fallback;
}

function iconForPlugin(pluginId: string) {
  if (pluginId === "blog") return "▤";
  if (pluginId === "storage-r2") return "◉";
  if (pluginId === "domains") return "◎";
  return "</>";
}
