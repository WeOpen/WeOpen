"use client";

import type { BlogPostInput, BlogPostStatus } from "@/shared/api/blog";
import type { StorageObject } from "@/shared/api/storage-r2";
import { Button, Card, ConfirmActionDialog, FileDropzone, Input, SelectField, Textarea } from "@weopen/ui";

type BlogPostEditorProps = {
  draft: BlogPostInput;
  isSaving: boolean;
  isUploadingCover: boolean;
  storageObjects: StorageObject[];
  onChange: (draft: BlogPostInput) => void;
  onCoverUpload: (file: File) => Promise<void>;
  onDelete: () => void;
  onNew: () => void;
  onSubmit: () => void;
  selectedPostId?: string;
};

const statuses: Array<{ label: string; value: BlogPostStatus }> = [
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
  { label: "Archived", value: "archived" }
];

export function BlogPostEditor({
  draft,
  isSaving,
  isUploadingCover,
  storageObjects,
  onChange,
  onCoverUpload,
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
  const coverCandidates = storageObjects.filter((object) =>
    object.contentType.toLowerCase().startsWith("image/")
  );

  return (
    <Card className="blog-editor">
      <Card.Header>
        <div className="blog-editor-toolbar">
          <div>
            <div className="page-kicker">Markdown</div>
            <Card.Title>{selectedPostId ? "Editor" : "New Draft"}</Card.Title>
          </div>
          <Button onPress={onNew} type="button" variant="secondary">
            Reset
          </Button>
        </div>
      </Card.Header>
      <Card.Content>
        <form
          className="blog-editor-form"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
      <Input
        label="Title"
        onChange={(event) => onChange({ ...draft, title: event.target.value })}
        placeholder="Building WeOpen: Design Principles"
        value={draft.title}
      />

      <Input
        label="Slug"
        onChange={(event) => onChange({ ...draft, slug: slugify(event.target.value) })}
        placeholder="vercel-free-deploy-notes"
        value={draft.slug}
      />

      <Textarea
        label="Excerpt"
        onChange={(event) => onChange({ ...draft, summary: event.target.value })}
        rows={3}
        value={draft.summary}
      />

      <div className="blog-editor-grid">
        <SelectField
          label="Status"
          onChange={(value) => onChange({ ...draft, status: value as BlogPostStatus })}
          options={statuses}
          value={draft.status}
        />
        <Input
          label="Categories"
          onChange={(event) => onChange({ ...draft, terms: mergeTerms(event.target.value, tags) })}
          placeholder="Engineering, Notes"
          value={categories}
        />
        <Input
          label="Tags"
          onChange={(event) => onChange({ ...draft, terms: mergeTerms(categories, event.target.value) })}
          placeholder="Go, Next.js, R2"
          value={tags}
        />
      </div>

      <div className="blog-cover-panel">
        <SelectField
          label="Cover Object"
          onChange={(value) => onChange({ ...draft, coverObjectKey: value })}
          placeholder="No cover object"
          options={[
            { label: "No cover object", value: "" },
            ...coverCandidates.map((object) => ({ label: object.filename, value: object.key }))
          ]}
          value={draft.coverObjectKey ?? ""}
        />
        <FileDropzone
          accept="image/*"
          buttonLabel="Select"
          disabled={isUploadingCover}
          isBusy={isUploadingCover}
          onFileSelect={(file) => void onCoverUpload(file)}
          title={isUploadingCover ? "Uploading cover" : "Drag & drop cover"}
        />
      </div>

      <Textarea
        className="blog-markdown"
        label="Markdown"
        onChange={(event) => onChange({ ...draft, contentMarkdown: event.target.value })}
        rows={16}
        value={draft.contentMarkdown}
      />

      <div className="blog-editor-actions">
        <Button disabled={isSaving} type="submit">
          {isSaving ? "Saving" : selectedPostId ? "Save Draft" : "Save Draft"}
        </Button>
        {selectedPostId ? (
          <ConfirmActionDialog
            confirmLabel="Delete Post"
            description="This action permanently removes the post and cannot be undone."
            onConfirm={onDelete}
            title="Delete post?"
            trigger={
              <Button disabled={isSaving} type="button" variant="danger-soft">
                Delete
              </Button>
            }
          />
        ) : null}
      </div>
        </form>
      </Card.Content>
    </Card>
  );
}

export function emptyBlogDraft(): BlogPostInput {
  return {
    title: "Building WeOpen: Design Principles",
    slug: "building-weopen-design-principles",
    summary: "WeOpen is a personal management platform built for control, clarity, and extensibility.",
    contentMarkdown: "# Building WeOpen: Design Principles\n\nWeOpen is a personal management platform built for control, clarity, and extensibility.\n\n## 1. Compile-Time Plugins\n\nWe use a **compile-time plugin registry** to ensure type safety, predictable behavior, and zero runtime surprises.\n\n- Static manifests\n- Deterministic ordering\n- No dynamic loading\n\n## 2. Self-Hosting First\n\nYour data stays yours. WeOpen runs anywhere you do.\n\n## 3. Minimal by Design\n\nA clean interface. No noise. Only what matters.",
    coverObjectKey: "",
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
