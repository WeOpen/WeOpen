import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Button, Card } from "@weopen/ui";
import type { BlogPostInput } from "@/shared/api/blog";

type BlogPostPreviewProps = {
  post: BlogPostInput;
  coverUrl?: string;
  isDraft?: boolean;
  onEdit?: () => void;
};

export function BlogPostPreview({ coverUrl, isDraft = false, onEdit, post }: BlogPostPreviewProps) {
  return (
    <Card className="blog-preview" aria-label="文章预览">
      <Card.Header>
        <div className="blog-editor-toolbar">
          <div>
            <div className="page-kicker">{isDraft ? "Draft Preview" : "Post Preview"}</div>
            <Card.Title>Preview</Card.Title>
          </div>
          {onEdit ? (
            <Button onPress={onEdit} type="button" variant="secondary">
              Edit
            </Button>
          ) : null}
        </div>
      </Card.Header>
      <Card.Content>
        <article>
          <div className="blog-preview-status">{statusLabel(post.status)}</div>
          {coverUrl ? (
            <Image
              alt={`${post.title || "Untitled post"} cover`}
              className="blog-preview-cover"
              height={360}
              src={coverUrl}
              unoptimized
              width={640}
            />
          ) : null}
          <h1>{post.title || "Untitled post"}</h1>
          {post.summary ? <p className="blog-preview-summary">{post.summary}</p> : null}
          <div className="blog-preview-body">
            {post.contentMarkdown.trim() ? (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                skipHtml
                components={{
                  a: ({ children, href }) => (
                    <a href={href} rel="noreferrer" target={href?.startsWith("http") ? "_blank" : undefined}>
                      {children}
                    </a>
                  )
                }}
              >
                {post.contentMarkdown}
              </ReactMarkdown>
            ) : (
              <p className="blog-preview-empty">Markdown preview will appear here.</p>
            )}
          </div>
        </article>
      </Card.Content>
    </Card>
  );
}

function statusLabel(status: BlogPostInput["status"]) {
  const labels = {
    draft: "DRAFT",
    published: "PUBLISHED",
    archived: "ARCHIVED"
  };
  return labels[status];
}
