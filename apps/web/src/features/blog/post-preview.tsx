import Image from "next/image";
import { Card } from "@weopen/ui";
import type { BlogPostInput } from "@/shared/api/blog";

type BlogPostPreviewProps = {
  post: BlogPostInput;
  coverUrl?: string;
};

export function BlogPostPreview({ coverUrl, post }: BlogPostPreviewProps) {
  const blocks = markdownBlocks(post.contentMarkdown);

  return (
    <Card className="blog-preview" aria-label="文章预览">
      <Card.Content>
        <article>
      <div className="blog-preview-status">{statusLabel(post.status)}</div>
      {coverUrl ? (
        <Image
          alt={`${post.title || "未命名文章"}封面图`}
          className="blog-preview-cover"
          height={360}
          src={coverUrl}
          unoptimized
          width={640}
        />
      ) : null}
      <h1>{post.title || "未命名文章"}</h1>
      {post.summary ? <p className="blog-preview-summary">{post.summary}</p> : null}
      <div className="blog-preview-body">
        {blocks.length ? (
          blocks.map((block, index) => renderBlock(block, index))
        ) : (
          <p className="blog-preview-empty">Markdown preview will appear here.</p>
        )}
      </div>
        </article>
      </Card.Content>
    </Card>
  );
}

function markdownBlocks(markdown: string) {
  return markdown
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

function renderBlock(block: string, index: number) {
  if (block.startsWith("### ")) {
    return <h3 key={index}>{block.slice(4)}</h3>;
  }
  if (block.startsWith("## ")) {
    return <h2 key={index}>{block.slice(3)}</h2>;
  }
  if (block.startsWith("# ")) {
    return <h1 key={index}>{block.slice(2)}</h1>;
  }
  if (block.startsWith("- ")) {
    return (
      <ul key={index}>
        {block.split("\n").map((line) => (
          <li key={line}>{line.replace(/^- /, "")}</li>
        ))}
      </ul>
    );
  }
  return <p key={index}>{block}</p>;
}

function statusLabel(status: BlogPostInput["status"]) {
  const labels = {
    draft: "DRAFT",
    published: "PUBLISHED",
    archived: "ARCHIVED"
  };
  return labels[status];
}
