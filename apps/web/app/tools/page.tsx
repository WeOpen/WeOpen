import { AppShell } from "@/shared/layout/app-shell";
import { DevtoolsPluginPage } from "@/plugins/devtools";

export default function ToolsPage() {
  return (
    <AppShell currentPath="/tools">
      <DevtoolsPluginPage />
    </AppShell>
  );
}
