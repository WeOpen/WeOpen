import type { PluginManifest } from "@weopen/plugin-sdk";
import { ToolsPage } from "./tools-page";

export function DevtoolsPluginPage({ manifest }: { manifest?: PluginManifest }) {
  return <ToolsPage manifest={manifest} />;
}
