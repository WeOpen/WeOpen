import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { webPluginRegistry } from "@/plugins/registry";

type PluginDetailPageProps = {
  params: Promise<{ pluginId: string }>;
};

export default async function PluginDetailPage({ params }: PluginDetailPageProps) {
  const { pluginId } = await params;
  let plugin: ReturnType<typeof webPluginRegistry.get>;

  try {
    plugin = webPluginRegistry.get(pluginId);
  } catch {
    notFound();
  }

  const Component = plugin.component;
  return <AppShell>{Component ? <Component manifest={plugin.manifest} /> : null}</AppShell>;
}
