import { PluginRegistry } from "@weopen/plugin-sdk";
import type { PluginManifest } from "@weopen/plugin-sdk";
import { BlogPluginPage } from "./blog";
import { builtinPluginManifests } from "./index";
import { StorageR2PluginPage } from "./storage-r2";

export type WebPluginComponent = (props: { manifest: PluginManifest }) => React.ReactNode;

export const webPluginRegistry = new PluginRegistry<WebPluginComponent>();

for (const manifest of builtinPluginManifests) {
  const component = manifest.id === "blog" ? BlogPluginPage : manifest.id === "storage-r2" ? StorageR2PluginPage : PlaceholderPluginPage;
  webPluginRegistry.register({
    manifest,
    component
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
      <div className="page-kicker">{manifest.id}</div>
      <h1 className="page-title">{manifest.name}</h1>
      <p className="page-description">{manifest.description}</p>
      <dl className="plugin-meta">
        <div>
          <dt>版本</dt>
          <dd>{manifest.version}</dd>
        </div>
        <div>
          <dt>权限</dt>
          <dd>{manifest.permissions.length ? manifest.permissions.join(", ") : "无特殊权限"}</dd>
        </div>
      </dl>
    </section>
  );
}
