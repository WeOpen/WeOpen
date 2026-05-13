"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@weopen/ui";
import type { BlogPost, BlogPostInput } from "@/lib/blog";
import {
  createBlogPost,
  deleteBlogPost,
  getBlogPost,
  listBlogPosts,
  updateBlogPost
} from "@/lib/blog";
import { BlogPostEditor, emptyBlogDraft } from "./post-editor";
import { BlogPostPreview } from "./post-preview";

type BlogPostsPageProps = {
  initialPostId?: string;
};

export function BlogPostsPage({ initialPostId }: BlogPostsPageProps) {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [selectedPostId, setSelectedPostId] = useState<string | undefined>(initialPostId);
  const [draft, setDraft] = useState<BlogPostInput>(() => emptyBlogDraft());
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadPosts() {
      setIsLoading(true);
      try {
        const nextPosts = await listBlogPosts();
        if (!cancelled) {
          setPosts(nextPosts);
          setMessage("");
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "文章列表读取失败");
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

  async function refreshPosts(nextSelectedId?: string) {
    const nextPosts = await listBlogPosts();
    setPosts(nextPosts);
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

  return (
    <section className="blog-workspace">
      <div className="page-header">
        <div className="page-kicker">Blog</div>
        <h1 className="page-title">博客管理</h1>
        <p className="page-description">
          管理 Markdown 文章、分类标签和发布状态。文章保存到后端博客插件 API，适合作为后续公开博客页和 R2 素材上传的内容底座。
        </p>
      </div>

      <div className="blog-stats" aria-label="文章状态统计">
        <Card title="草稿" description={`${counts.draft} 篇`} />
        <Card title="已发布" description={`${counts.published} 篇`} />
        <Card title="已归档" description={`${counts.archived} 篇`} />
      </div>

      {message ? <p className="form-message">{message}</p> : null}

      <div className="blog-layout">
        <aside className="blog-post-list" aria-label="文章列表">
          <div className="blog-list-header">
            <h2>文章</h2>
            <span>{isLoading ? "读取中" : `${posts.length} 篇`}</span>
          </div>
          {posts.length ? (
            posts.map((post) => (
              <button
                className={
                  post.id === selectedPostId ? "blog-post-row blog-post-row-active" : "blog-post-row"
                }
                key={post.id}
                onClick={() => setSelectedPostId(post.id)}
                type="button"
              >
                <span>{post.title}</span>
                <small>
                  {statusLabel(post.status)} · {post.slug}
                </small>
              </button>
            ))
          ) : (
            <p className="blog-empty">还没有文章，先创建一篇草稿。</p>
          )}
        </aside>

        <BlogPostEditor
          draft={draft}
          isSaving={isSaving}
          onChange={setDraft}
          onDelete={removePost}
          onNew={() => {
            setSelectedPostId(undefined);
            setDraft(emptyBlogDraft());
            setMessage("");
          }}
          onSubmit={savePost}
          selectedPostId={selectedPostId}
        />

        <BlogPostPreview post={draft} />
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
    archived: "归档",
    draft: "草稿",
    published: "发布"
  };
  return labels[status];
}
