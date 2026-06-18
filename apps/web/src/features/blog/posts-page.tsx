"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { BlogPost, BlogPostInput } from "@/shared/api/blog";
import {
  createBlogPost,
  deleteBlogPost,
  getBlogPost,
  listBlogPosts,
  updateBlogPost
} from "@/shared/api/blog";
import type { StorageObject } from "@/shared/api/storage-r2";
import { listStorageObjects, uploadStorageFile } from "@/shared/api/storage-r2";
import { slugifyFilename } from "@/shared/format";
import { useRouteRefresh } from "@/shared/hooks/use-route-refresh";
import { BlogPostEditor, emptyBlogDraft } from "./post-editor";
import { BlogPostPreview } from "./post-preview";
import { Alert, Button, Card, Chip, SkeletonStack } from "@weopen/ui";

type BlogPostsPageProps = {
  initialPostId?: string;
};

type BlogDetailMode = "edit" | "preview";
type BlogPostFilter = "all" | "draft" | "published";
type SampleBlogPost = BlogPostInput & {
  date: string;
};

const blogPostFilters: Array<{ label: string; value: BlogPostFilter }> = [
  { label: "All", value: "all" },
  { label: "Drafts", value: "draft" },
  { label: "Published", value: "published" }
];

const samplePosts: SampleBlogPost[] = [
  {
    title: "Building WeOpen: Design Principles",
    slug: "building-weopen-design-principles",
    date: "2025-05-20 14:12",
    status: "draft",
    summary: "A compact note on how WeOpen keeps personal infrastructure clear, local-first, and extensible.",
    contentMarkdown: "## Product Shape\n\nWeOpen treats personal management as a small control room: calm surfaces, direct actions, and no mystery state.\n\n## Plugin Rules\n\n- Keep manifests static and reviewable\n- Make backend contracts boring and stable\n- Let each plugin own its focused workflow\n\n> The interface should make advanced infrastructure feel ordinary.",
    coverObjectKey: "",
    terms: [
      { name: "Engineering", slug: "engineering", type: "category" },
      { name: "Design", slug: "design", type: "tag" }
    ]
  },
  {
    title: "Self-Hosting in 2025",
    slug: "self-hosting-in-2025",
    date: "2025-05-16 09:34",
    status: "published",
    summary: "A practical checklist for running personal software without turning maintenance into a second job.",
    contentMarkdown: "## Operating Model\n\nSelf-hosting works best when the boring parts are automated and visible.\n\n| Area | Default |\n| --- | --- |\n| Backups | Scheduled and tested |\n| Secrets | Encrypted at rest |\n| Logs | Short retention, useful signals |\n\n```bash\npnpm dev:web\npnpm dev:api\n```",
    coverObjectKey: "",
    terms: [
      { name: "Operations", slug: "operations", type: "category" },
      { name: "Self Hosting", slug: "self-hosting", type: "tag" }
    ]
  },
  {
    title: "Why Compile-Time Plugins",
    slug: "why-compile-time-plugins",
    date: "2025-05-10 18:22",
    status: "published",
    summary: "Runtime loading is flexible, but compile-time registration gives WeOpen a smaller blast radius.",
    contentMarkdown: "## Why This Boundary Exists\n\nCompile-time plugins make the registry explicit. The app can type-check manifests, route metadata, and UI ownership before it ships.\n\n## Tradeoffs\n\n1. Fewer runtime surprises\n2. Simpler permission review\n3. Less magic for plugin authors",
    coverObjectKey: "",
    terms: [
      { name: "Architecture", slug: "architecture", type: "category" },
      { name: "Plugins", slug: "plugins", type: "tag" }
    ]
  },
  {
    title: "R2 Storage Plugin Deep Dive",
    slug: "r2-storage-plugin-deep-dive",
    date: "2025-05-08 11:03",
    status: "draft",
    summary: "How the storage plugin maps object uploads, metadata, and public file URLs into one workflow.",
    contentMarkdown: "## Upload Path\n\nThe R2 plugin keeps file metadata in the API and sends object bytes directly through the storage adapter.\n\n## UI Goals\n\n- Show upload state immediately\n- Keep object keys copyable\n- Make cover selection available to Blog without custom glue",
    coverObjectKey: "",
    terms: [
      { name: "Storage", slug: "storage", type: "category" },
      { name: "R2", slug: "r2", type: "tag" }
    ]
  },
  {
    title: "DevTools for Everyone",
    slug: "devtools-for-everyone",
    date: "2025-05-03 16:45",
    status: "published",
    summary: "Developer tools inside WeOpen should explain the system without requiring a terminal first.",
    contentMarkdown: "## Principle\n\nA good DevTools panel turns hidden platform behavior into visible, reversible operations.\n\n## Useful Checks\n\n- API health\n- Plugin route status\n- Environment configuration\n- Recent audit activity",
    coverObjectKey: "",
    terms: [
      { name: "Developer Experience", slug: "developer-experience", type: "category" },
      { name: "Tools", slug: "tools", type: "tag" }
    ]
  },
  {
    title: "Managing Domains at Scale",
    slug: "managing-domains-at-scale",
    date: "2025-04-28 10:17",
    status: "published",
    summary: "Domain workflows need quick scanning, clear status, and fewer places where DNS intent can drift.",
    contentMarkdown: "## Domain Inventory\n\nDomains are easier to manage when expiration, DNS state, and ownership notes live together.\n\n## Next Improvements\n\n- Renewal reminders\n- DNS record diffing\n- Certificate status checks",
    coverObjectKey: "",
    terms: [
      { name: "Domains", slug: "domains", type: "category" },
      { name: "DNS", slug: "dns", type: "tag" }
    ]
  },
  {
    title: "WeOpen Release Notes",
    slug: "weopen-release-notes",
    date: "2025-04-20 13:50",
    status: "published",
    summary: "A sample changelog entry showing short sections, links, and release highlights in Markdown.",
    contentMarkdown: "## Highlights\n\n- Blog now supports Markdown preview\n- Plugin detail pages react to enable state changes\n- The shell can collapse navigation to icon-only mode\n\n## Upgrade Notes\n\nRun the usual workspace checks before shipping.",
    coverObjectKey: "",
    terms: [
      { name: "Release Notes", slug: "release-notes", type: "category" },
      { name: "Changelog", slug: "changelog", type: "tag" }
    ]
  },
  {
    title: "TLS Automation Made Simple",
    slug: "tls-automation-made-simple",
    date: "2025-04-12 08:11",
    status: "draft",
    summary: "A draft outline for reducing certificate work to a visible lifecycle with plain recovery paths.",
    contentMarkdown: "## Certificate Lifecycle\n\nThe safest certificate workflow is boring: request, validate, renew, alert, and recover.\n\n## Open Questions\n\n- Which providers should ship first?\n- Where should renewal failures surface?\n- Should domain ownership checks block publishing?",
    coverObjectKey: "",
    terms: [
      { name: "Security", slug: "security", type: "category" },
      { name: "TLS", slug: "tls", type: "tag" }
    ]
  }
];

const blogRefreshPathnamePrefixes = ["/blog", "/plugins/blog"] as const;

export function BlogPostsPage({ initialPostId }: BlogPostsPageProps) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string | undefined>(initialPostId);
  const [selectedSamplePostSlug, setSelectedSamplePostSlug] = useState<string | undefined>();
  const [postFilter, setPostFilter] = useState<BlogPostFilter>("all");
  const [detailMode, setDetailMode] = useState<BlogDetailMode>(initialPostId ? "preview" : "edit");
  const [draft, setDraft] = useState<BlogPostInput>(() => emptyBlogDraft());
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [storageObjects, setStorageObjects] = useState<StorageObject[]>([]);

  const loadPosts = useCallback(() => {
    let cancelled = false;
    void Promise.all([
      listBlogPosts(),
      listStorageObjects().catch(() => [] as StorageObject[])
    ])
      .then(([nextPosts, nextObjects]) => {
        if (cancelled) {
          return;
        }
        setPosts(nextPosts);
        setStorageObjects(nextObjects);
        setMessage("");
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        void error;
        setMessage("");
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useRouteRefresh({
    pathnamePrefixes: blogRefreshPathnamePrefixes,
    refresh: loadPosts
  });

  useEffect(() => {
    if (!selectedPostId) {
      return;
    }
    const postId = selectedPostId;
    let cancelled = false;
    async function loadPost() {
      try {
        const post = await getBlogPost(postId);
        if (!cancelled) {
          setDraft(toInput(post));
          setMessage("");
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "文章读取失败");
        }
      }
    }
    void loadPost();
    return () => {
      cancelled = true;
    };
  }, [selectedPostId]);

  const safePosts = useMemo(() => Array.isArray(posts) ? posts : [], [posts]);
  const safeStorageObjects = useMemo(() => Array.isArray(storageObjects) ? storageObjects : [], [storageObjects]);
  const filteredPosts = useMemo(() => filterPostsByStatus(safePosts, postFilter), [postFilter, safePosts]);
  const filteredSamplePosts = useMemo(() => filterPostsByStatus(samplePosts, postFilter), [postFilter]);
  const visiblePostCount = safePosts.length ? filteredPosts.length : filteredSamplePosts.length;
  const selectedCover = useMemo(() => {
    return safeStorageObjects.find((object) => object.key === draft.coverObjectKey);
  }, [draft.coverObjectKey, safeStorageObjects]);

  async function refreshPosts(nextSelectedId?: string) {
    const [nextPosts, nextObjects] = await Promise.all([
      listBlogPosts(),
      listStorageObjects().catch(() => safeStorageObjects)
    ]);
    setPosts(nextPosts);
    setStorageObjects(nextObjects);
    if (nextSelectedId !== undefined) {
      setSelectedPostId(nextSelectedId);
    }
  }

  async function savePost() {
    setIsSaving(true);
    setMessage("");
    try {
      const saved = selectedPostId
        ? await updateBlogPost(selectedPostId, draft)
        : await createBlogPost(draft);
      setSelectedSamplePostSlug(undefined);
      setDraft(toInput(saved));
      await refreshPosts(saved.id);
      setDetailMode("preview");
      setMessage(selectedPostId ? "文章已保存" : "文章已创建");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "文章保存失败");
    } finally {
      setIsSaving(false);
    }
  }

  async function removePost() {
    if (!selectedPostId) {
      return;
    }
    setIsSaving(true);
    setMessage("");
    try {
      await deleteBlogPost(selectedPostId);
      setSelectedPostId(undefined);
      setSelectedSamplePostSlug(undefined);
      setDraft(emptyBlogDraft());
      setDetailMode("edit");
      await refreshPosts(undefined);
      setMessage("文章已删除");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "文章删除失败");
    } finally {
      setIsSaving(false);
    }
  }

  async function uploadCover(file: File) {
    if (file.size <= 0) {
      setMessage("请选择非空封面文件");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setMessage("封面文件必须是图片类型");
      return;
    }
    setIsUploadingCover(true);
    setMessage("");
    try {
      const key = `blog/covers/${Date.now()}-${slugifyFilename(file.name)}`;
      const object = await uploadStorageFile(
        {
          key,
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          size: file.size,
          visibility: "public"
        },
        file
      );
      const nextObjects = await listStorageObjects();
      setStorageObjects(nextObjects);
      setDraft((current) => ({ ...current, coverObjectKey: object.key }));
      setMessage("封面已上传并关联到文章");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "封面上传失败");
    } finally {
      setIsUploadingCover(false);
    }
  }

  function startNewPost() {
    setSelectedPostId(undefined);
    setSelectedSamplePostSlug(undefined);
    setDraft(emptyBlogDraft());
    setDetailMode("edit");
    setMessage("");
  }

  function selectPost(postId: string) {
    setSelectedPostId(postId);
    setSelectedSamplePostSlug(undefined);
    setDetailMode("preview");
    setMessage("");
  }

  function selectSamplePost(post: SampleBlogPost) {
    setSelectedPostId(undefined);
    setSelectedSamplePostSlug(post.slug);
    setDraft(toSampleInput(post));
    setDetailMode("preview");
    setMessage("");
  }

  function selectPostFilter(nextFilter: BlogPostFilter) {
    setPostFilter(nextFilter);
    setMessage("");

    if (safePosts.length) {
      const nextPosts = filterPostsByStatus(safePosts, nextFilter);
      const selectedPostIsVisible = nextPosts.some((post) => post.id === selectedPostId);
      if (!selectedPostIsVisible && nextPosts[0]) {
        selectPost(nextPosts[0].id);
      }
      return;
    }

    const nextSamples = filterPostsByStatus(samplePosts, nextFilter);
    const selectedSampleIsVisible = nextSamples.some((post) => post.slug === selectedSamplePostSlug);
    if (!selectedSampleIsVisible && nextSamples[0]) {
      selectSamplePost(nextSamples[0]);
    }
  }

  return (
    <section className="blog-workspace">
      {message ? (
        <Alert status="accent">
          <Alert.Content>
            <Alert.Description>{message}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <div className="blog-layout">
        <Card className="blog-post-list" aria-label="文章列表">
          <Card.Header>
            <div className="blog-list-header">
              <Card.Title>Posts <strong>{isLoading ? "··" : visiblePostCount}</strong></Card.Title>
            </div>
            <Button fullWidth onPress={startNewPost} type="button" variant="secondary">
              + New Post
            </Button>
            <div className="blog-list-tabs" aria-label="Post filters" role="tablist">
              {blogPostFilters.map((filter) => (
                <button
                  aria-selected={postFilter === filter.value}
                  key={filter.value}
                  onClick={() => selectPostFilter(filter.value)}
                  role="tab"
                  type="button"
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </Card.Header>
          <Card.Content>
            {isLoading ? (
              <SkeletonStack className="blog-post-list-items" rowHeight={58} rows={7} widths={["100%", "92%", "86%", "96%"]} />
            ) : safePosts.length ? (
              <div className="blog-post-list-items">
                {filteredPosts.length ? filteredPosts.map((post) => (
                  <Button
                    className={post.id === selectedPostId ? "blog-post-row blog-post-row-active" : "blog-post-row"}
                    aria-pressed={post.id === selectedPostId}
                    key={post.id}
                    onPress={() => selectPost(post.id)}
                    type="button"
                    variant="ghost"
                  >
                    <span>{post.title}</span>
                    <small>
                      {statusLabel(post.status)} · {post.slug}
                    </small>
                  </Button>
                )) : <p className="blog-empty">No posts in this filter.</p>}
              </div>
            ) : (
              <div className="blog-post-list-items blog-sample-list">
                {filteredSamplePosts.length ? filteredSamplePosts.map((post) => (
                  <Button
                    className={post.slug === selectedSamplePostSlug ? "blog-post-row blog-post-row-active" : "blog-post-row"}
                    aria-pressed={post.slug === selectedSamplePostSlug}
                    key={post.slug}
                    onPress={() => selectSamplePost(post)}
                    type="button"
                    variant="ghost"
                  >
                    <span>{post.title}</span>
                    <small>
                      {post.date} · {post.slug}
                    </small>
                    <Chip size="sm" variant="soft">{statusLabel(post.status)}</Chip>
                  </Button>
                )) : <p className="blog-empty">No sample posts in this filter.</p>}
              </div>
            )}
          </Card.Content>
        </Card>

        <div className="blog-detail-pane">
          {detailMode === "edit" ? (
            <BlogPostEditor
              draft={draft}
              isSaving={isSaving}
              isUploadingCover={isUploadingCover}
              storageObjects={safeStorageObjects}
              onChange={setDraft}
              onCoverUpload={uploadCover}
              onDelete={removePost}
              onNew={startNewPost}
              onPreview={() => setDetailMode("preview")}
              onSubmit={savePost}
              selectedPostId={selectedPostId}
            />
          ) : (
            <BlogPostPreview
              coverUrl={selectedCover?.downloadUrl}
              isDraft={draft.status === "draft"}
              onEdit={() => setDetailMode("edit")}
              post={draft}
            />
          )}
        </div>
      </div>
    </section>
  );
}

function filterPostsByStatus<T extends { status: BlogPostInput["status"] }>(
  posts: T[],
  filter: BlogPostFilter
): T[] {
  if (filter === "all") {
    return posts;
  }
  return posts.filter((post) => post.status === filter);
}

function toSampleInput(post: SampleBlogPost): BlogPostInput {
  return {
    title: post.title,
    slug: post.slug,
    summary: post.summary,
    contentMarkdown: post.contentMarkdown,
    coverObjectKey: post.coverObjectKey ?? "",
    status: post.status,
    terms: post.terms.map((term) => ({
      name: term.name,
      slug: term.slug,
      type: term.type
    }))
  };
}

function toInput(post: BlogPost): BlogPostInput {
  const terms = Array.isArray(post.terms) ? post.terms : [];

  return {
    title: post.title,
    slug: post.slug,
    summary: post.summary,
    contentMarkdown: post.contentMarkdown,
    coverObjectKey: post.coverObjectKey ?? "",
    status: post.status,
    terms: terms.map((term) => ({
      name: term.name,
      slug: term.slug,
      type: term.type
    }))
  };
}

function statusLabel(status: BlogPostInput["status"]) {
  const labels = {
    archived: "ARCHIVED",
    draft: "DRAFT",
    published: "PUBLISHED"
  };
  return labels[status];
}
