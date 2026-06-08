import { AppShell } from "@/shared/layout/app-shell";
import { StorageR2PluginPage } from "@/features/storage-r2";

export default function StoragePage() {
  return (
    <AppShell currentPath="/storage">
      <StorageR2PluginPage />
    </AppShell>
  );
}
