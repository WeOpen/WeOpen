import { AppShell } from "@/components/app-shell";
import { BlogPluginPage } from "@/plugins/blog";

export default function BlogPage() {
  return (
    <AppShell>
      <BlogPluginPage />
    </AppShell>
  );
}
