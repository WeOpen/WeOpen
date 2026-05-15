import { AppShell } from "@/shared/layout/app-shell";
import { DomainsPluginPage } from "@/plugins/domains";

export default function DomainsPageRoute() {
  return (
    <AppShell currentPath="/domains">
      <DomainsPluginPage />
    </AppShell>
  );
}
