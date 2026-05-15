import type { PluginManifest } from "@weopen/plugin-sdk";
import { DomainsPage } from "./domains-page";

export function DomainsPluginPage({ manifest }: { manifest?: PluginManifest }) {
  return <DomainsPage manifest={manifest} />;
}
