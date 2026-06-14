import { BlogPluginPage } from "@/features/blog";

type BlogPostPageProps = {
  params: Promise<{ id: string }>;
};

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { id } = await params;

  return <BlogPluginPage initialPostId={id} />;
}
