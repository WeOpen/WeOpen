// Web plugin registration maps compile-time manifests to page components; the API still enforces permissions.
import { PluginRegistry } from "@weopen/plugin-sdk";
import type { PluginManifest } from "@weopen/plugin-sdk";
import { BlogPluginPage } from "@/features/blog";
import { builtinPluginManifests } from "./index";
import { DevtoolsPluginPage } from "./devtools";
import { StorageR2PluginPage } from "@/features/storage-r2";

/** WebPluginComponent is the React entry point associated with one plugin manifest. */
export type WebPluginComponent = (props: { manifest: PluginManifest }) => React.ReactNode;

/** webPluginRegistry stores built-in plugin UI metadata for navigation, widgets, and routes. */
export const webPluginRegistry = new PluginRegistry<WebPluginComponent>();

for (const manifest of builtinPluginManifests) {
  const component =
    manifest.id === "blog"
      ? BlogPluginPage
      : manifest.id === "storage-r2"
        ? StorageR2PluginPage
        : manifest.id === "devtools"
          ? DevtoolsPluginPage
          : PlaceholderPluginPage;
  webPluginRegistry.register({
    manifest,
    component
  });
}

/** pluginNavigation exposes enabled plugin links for the application shell. */
export const pluginNavigation = webPluginRegistry.navigation();

/** pluginManifests exposes all built-in manifests for the plugin management screen. */
export const pluginManifests = webPluginRegistry.manifests(true);

/** pluginDashboardWidgets flattens enabled plugin widgets with their owning plugin metadata. */
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

/** PlaceholderPluginPage keeps manifest-only plugins visible without granting backend behavior. */
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
