import { PluginRegistry } from "@weopen/plugin-sdk";
import type { PluginManifest } from "@weopen/plugin-sdk";
import { builtinPluginManifests } from "./index";

export type WebPluginComponent = (props: { manifest: PluginManifest }) => React.ReactNode;

export const webPluginRegistry = new PluginRegistry<WebPluginComponent>();

for (const manifest of builtinPluginManifests) {
  webPluginRegistry.register({
    manifest,
    component: PlaceholderPluginPage
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
