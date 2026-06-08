import { PluginRegistry } from "@weopen/plugin-sdk";
import type { PluginManifest } from "@weopen/plugin-sdk";
import { BlogPluginPage } from "@/features/blog";
import { builtinPluginManifests } from "./index";
import { DevtoolsPluginPage } from "./devtools";
import { DomainsPluginPage } from "./domains";
import { StorageR2PluginPage } from "@/features/storage-r2";
import { Card, PageHeader, StatusChip } from "@weopen/ui";

export type WebPluginComponent = (props: { manifest: PluginManifest }) => React.ReactNode;

const pluginComponents: Partial<Record<string, WebPluginComponent>> = {
  blog: BlogPluginPage,
  domains: DomainsPluginPage,
  devtools: DevtoolsPluginPage,
  "storage-r2": StorageR2PluginPage
};

export const webPluginRegistry = new PluginRegistry<WebPluginComponent>();

for (const manifest of builtinPluginManifests) {
  webPluginRegistry.register({
    manifest,
    component: pluginComponents[manifest.id] ?? PlaceholderPluginPage
  });
}

export const pluginNavigation = webPluginRegistry.navigation();

export const pluginManifests = webPluginRegistry.manifests(true);

export function pluginDashboardWidgets() {
  return webPluginRegistry
    .enabled()
    .flatMap((plugin) =>
      (plugin.manifest.widgets ?? []).map((widget) => ({
        ...widget,
        pluginId: plugin.manifest.id,
        pluginName: plugin.manifest.name
      }))
    );
}

export function PlaceholderPluginPage({ manifest }: { manifest: PluginManifest }) {
  return (
    <section className="plugin-placeholder">
      <PageHeader eyebrow={manifest.id} title={manifest.name} description={manifest.description} />
      <Card className="plugin-meta">
        <Card.Content>
          <dl>
            <div>
              <dt>版本</dt>
              <dd>{manifest.version}</dd>
            </div>
            <div>
              <dt>权限</dt>
              <dd>
                <StatusChip tone={manifest.permissions.length ? "accent" : "neutral"}>
                  {manifest.permissions.length ? manifest.permissions.join(", ") : "无特殊权限"}
                </StatusChip>
              </dd>
            </div>
          </dl>
        </Card.Content>
      </Card>
    </section>
  );
}
