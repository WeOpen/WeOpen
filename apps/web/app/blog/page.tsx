import { AppShell } from "@/shared/layout/app-shell";
import { BlogPluginPage } from "@/features/blog";

export default function BlogPage() {
  return (
    <AppShell>
      <BlogPluginPage />
    </AppShell>
  );
}
