import { AppShell } from "@/components/app-shell";
import { BlogPluginPage } from "@/plugins/blog";

type BlogPostPageProps = {
  params: Promise<{ id: string }>;
};

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { id } = await params;

  return (
    <AppShell>
      <BlogPluginPage initialPostId={id} />
    </AppShell>
  );
}
