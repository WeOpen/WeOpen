import type { PluginManifest } from "@weopen/plugin-sdk";
import { BlogPostsPage } from "./posts-page";

export function BlogPluginPage({
  initialPostId
}: {
  initialPostId?: string;
  manifest?: PluginManifest;
}) {
  return <BlogPostsPage initialPostId={initialPostId} />;
}
