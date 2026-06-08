"use client";

import { useEffect, useMemo, useState } from "react";
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
import { BlogPostEditor, emptyBlogDraft } from "./post-editor";
import { BlogPostPreview } from "./post-preview";
import { Alert, Button, Card, Chip } from "@weopen/ui";

type BlogPostsPageProps = {
  initialPostId?: string;
};

const samplePosts = [
  { title: "Building WeOpen: Design Principles", date: "2025-05-20 14:12", status: "DRAFT" },
  { title: "Self-Hosting in 2025", date: "2025-05-16 09:34", status: "PUBLISHED" },
  { title: "Why Compile-Time Plugins", date: "2025-05-10 18:22", status: "PUBLISHED" },
  { title: "R2 Storage Plugin Deep Dive", date: "2025-05-08 11:03", status: "DRAFT" },
  { title: "DevTools for Everyone", date: "2025-05-03 16:45", status: "PUBLISHED" },
  { title: "Managing Domains at Scale", date: "2025-04-28 10:17", status: "PUBLISHED" },
  { title: "WeOpen Release Notes", date: "2025-04-20 13:50", status: "PUBLISHED" },
  { title: "TLS Automation Made Simple", date: "2025-04-12 08:11", status: "DRAFT" }
];

export function BlogPostsPage({ initialPostId }: BlogPostsPageProps) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string | undefined>(initialPostId);
  const [draft, setDraft] = useState<BlogPostInput>(() => emptyBlogDraft());
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [storageObjects, setStorageObjects] = useState<StorageObject[]>([]);

  useEffect(() => {
    let cancelled = false;
    async function loadPosts() {
      setIsLoading(true);
      try {
        const [nextPosts, nextObjects] = await Promise.all([
          listBlogPosts(),
          listStorageObjects().catch(() => [] as StorageObject[])
        ]);
        if (!cancelled) {
          setPosts(nextPosts);
          setStorageObjects(nextObjects);
          setMessage("");
        }
      } catch (error) {
        if (!cancelled) {
          void error;
          setMessage("");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    void loadPosts();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const counts = useMemo(() => {
    return posts.reduce(
      (result, post) => {
        result[post.status] += 1;
        return result;
      },
      { archived: 0, draft: 0, published: 0 }
    );
  }, [posts]);
  const selectedCover = useMemo(() => {
    return storageObjects.find((object) => object.key === draft.coverObjectKey);
  }, [draft.coverObjectKey, storageObjects]);

  async function refreshPosts(nextSelectedId?: string) {
    const [nextPosts, nextObjects] = await Promise.all([
      listBlogPosts(),
      listStorageObjects().catch(() => storageObjects)
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
      setDraft(toInput(saved));
      await refreshPosts(saved.id);
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
      setDraft(emptyBlogDraft());
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
              <div>
                <div className="page-kicker">Blog</div>
                <Card.Title>Posts <strong>{isLoading ? "··" : Math.max(posts.length, counts.draft + counts.published + counts.archived || 24)}</strong></Card.Title>
              </div>
            </div>
            <Button fullWidth onPress={() => {
              setSelectedPostId(undefined);
              setDraft(emptyBlogDraft());
              setMessage("");
            }} type="button" variant="secondary">
              + New Post
            </Button>
            <div className="blog-list-tabs" aria-label="Post filters">
              <span aria-current="page">All</span>
              <span>Drafts</span>
              <span>Published</span>
            </div>
          </Card.Header>
          <Card.Content>
            {posts.length ? (
              <div className="blog-post-list-items">
                {posts.map((post) => (
                  <Button
                    className={post.id === selectedPostId ? "blog-post-row blog-post-row-active" : "blog-post-row"}
                    key={post.id}
                    onPress={() => setSelectedPostId(post.id)}
                    type="button"
                    variant="ghost"
                  >
                    <span>{post.title}</span>
                    <small>
                      {statusLabel(post.status)} · {post.slug}
                    </small>
                  </Button>
                ))}
              </div>
            ) : (
              <div className="blog-post-list-items blog-sample-list">
                {samplePosts.map((post, index) => (
                  <Button
                    className={index === 0 ? "blog-post-row blog-post-row-active" : "blog-post-row"}
                    key={post.title}
                    onPress={() => undefined}
                    type="button"
                    variant="ghost"
                  >
                    <span>{post.title}</span>
                    <small>{post.date}</small>
                    <Chip size="sm" variant="soft">{post.status}</Chip>
                  </Button>
                ))}
              </div>
            )}
          </Card.Content>
        </Card>

        <BlogPostEditor
          draft={draft}
          isSaving={isSaving}
          isUploadingCover={isUploadingCover}
          storageObjects={storageObjects}
          onChange={setDraft}
          onCoverUpload={uploadCover}
          onDelete={removePost}
          onNew={() => {
            setSelectedPostId(undefined);
            setDraft(emptyBlogDraft());
            setMessage("");
          }}
          onSubmit={savePost}
          selectedPostId={selectedPostId}
        />

        <BlogPostPreview coverUrl={selectedCover?.downloadUrl} post={draft} />
      </div>
    </section>
  );
}

function toInput(post: BlogPost): BlogPostInput {
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

function statusLabel(status: BlogPost["status"]) {
  const labels = {
    archived: "ARCHIVED",
    draft: "DRAFT",
    published: "PUBLISHED"
  };
  return labels[status];
}
