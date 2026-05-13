"use client";

import { Button } from "@weopen/ui";
import type { BlogPostInput, BlogPostStatus } from "@/lib/blog";

type BlogPostEditorProps = {
  draft: BlogPostInput;
  isSaving: boolean;
  onChange: (draft: BlogPostInput) => void;
  onDelete: () => void;
  onNew: () => void;
  onSubmit: () => void;
  selectedPostId?: string;
};

const statuses: Array<{ label: string; value: BlogPostStatus }> = [
  { label: "草稿", value: "draft" },
  { label: "发布", value: "published" },
  { label: "归档", value: "archived" }
];

export function BlogPostEditor({
  draft,
  isSaving,
  onChange,
  onDelete,
  onNew,
  onSubmit,
  selectedPostId
}: BlogPostEditorProps) {
  const categories = draft.terms
    .filter((term) => term.type === "category")
    .map((term) => term.name)
    .join(", ");
  const tags = draft.terms
    .filter((term) => term.type === "tag")
    .map((term) => term.name)
    .join(", ");

  return (
    <form
      className="blog-editor"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <div className="blog-editor-toolbar">
        <div>
          <div className="page-kicker">{selectedPostId ? "Edit" : "New"}</div>
          <h2>{selectedPostId ? "编辑文章" : "新建文章"}</h2>
        </div>
        <Button onClick={onNew} type="button" variant="secondary">
          新建
        </Button>
      </div>

      <label className="ui-input-field">
        <span className="ui-input-label">标题</span>
        <input
          className="ui-input"
          onChange={(event) => onChange({ ...draft, title: event.target.value })}
          placeholder="比如：Vercel 免费部署踩坑笔记"
          value={draft.title}
        />
      </label>

      <label className="ui-input-field">
        <span className="ui-input-label">Slug</span>
        <input
          className="ui-input"
          onChange={(event) => onChange({ ...draft, slug: slugify(event.target.value) })}
          placeholder="vercel-free-deploy-notes"
          value={draft.slug}
        />
      </label>

      <label className="ui-input-field">
        <span className="ui-input-label">摘要</span>
        <textarea
          className="ui-textarea"
          onChange={(event) => onChange({ ...draft, summary: event.target.value })}
          rows={3}
          value={draft.summary}
        />
      </label>

      <div className="blog-editor-grid">
        <label className="ui-input-field">
          <span className="ui-input-label">状态</span>
          <select
            className="ui-input"
            onChange={(event) =>
              onChange({ ...draft, status: event.target.value as BlogPostStatus })
            }
            value={draft.status}
          >
            {statuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
        <label className="ui-input-field">
          <span className="ui-input-label">分类</span>
          <input
            className="ui-input"
            onChange={(event) =>
              onChange({ ...draft, terms: mergeTerms(event.target.value, tags) })
            }
            placeholder="工程, 随笔"
            value={categories}
          />
        </label>
        <label className="ui-input-field">
          <span className="ui-input-label">标签</span>
          <input
            className="ui-input"
            onChange={(event) =>
              onChange({ ...draft, terms: mergeTerms(categories, event.target.value) })
            }
            placeholder="Go, Next.js, R2"
            value={tags}
          />
        </label>
      </div>

      <label className="ui-input-field">
        <span className="ui-input-label">Markdown</span>
        <textarea
          className="ui-textarea blog-markdown"
          onChange={(event) => onChange({ ...draft, contentMarkdown: event.target.value })}
          rows={16}
          value={draft.contentMarkdown}
        />
      </label>

      <div className="blog-editor-actions">
        <Button disabled={isSaving} type="submit">
          {isSaving ? "保存中" : selectedPostId ? "保存文章" : "创建文章"}
        </Button>
        {selectedPostId ? (
          <Button disabled={isSaving} onClick={onDelete} type="button" variant="secondary">
            删除
          </Button>
        ) : null}
      </div>
    </form>
  );
}

export function emptyBlogDraft(): BlogPostInput {
  return {
    title: "",
    slug: "",
    summary: "",
    contentMarkdown: "# 新文章\n\n从这里开始写。",
    status: "draft",
    terms: []
  };
}

export function mergeTerms(categories: string, tags: string): BlogPostInput["terms"] {
  return [
    ...splitTerms(categories, "category"),
    ...splitTerms(tags, "tag")
  ];
}

function splitTerms(value: string, type: "category" | "tag") {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((name) => ({
      name,
      slug: slugify(name),
      type
    }));
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
