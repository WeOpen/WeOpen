// Blog API calls require an authenticated session; server-side plugin permissions remain authoritative.
import { apiFetch, apiUrl } from "./base";

/** BlogPostStatus mirrors the backend lifecycle states for filtering and edits. */
export type BlogPostStatus = "draft" | "published" | "archived";

/** BlogTermType distinguishes category and tag taxonomy records. */
export type BlogTermType = "category" | "tag";

/** BlogTerm is the browser DTO for blog categories and tags. */
export type BlogTerm = {
  id: string;
  name: string;
  slug: string;
  type: BlogTermType;
  createdAt: string;
  updatedAt: string;
};

/** BlogPost is the browser DTO for Markdown posts and optional storage-backed cover media. */
export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  contentMarkdown: string;
  coverObjectKey?: string;
  status: BlogPostStatus;
  terms: BlogTerm[] | null;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
};

/** BlogPostInput is sent to create/update endpoints; validation and publishing rules run on the API. */
export type BlogPostInput = {
  title: string;
  slug: string;
  summary: string;
  contentMarkdown: string;
  coverObjectKey?: string;
  status: BlogPostStatus;
  terms: Array<{
    name: string;
    slug: string;
    type: BlogTermType;
  }>;
};

type BlogPostsResponse = {
  posts: BlogPost[];
};


/** listBlogPosts reads posts, optionally filtered by lifecycle status. */
export async function listBlogPosts(status?: BlogPostStatus): Promise<BlogPost[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  const response = await fetch(apiUrl(`/api/plugins/blog/posts${query}`), {
    credentials: "include",
    headers: { Accept: "application/json" }
  });
  await ensureBlogResponse(response, "文章列表读取失败");
  const body = (await response.json()) as BlogPostsResponse;
  return Array.isArray(body.posts) ? body.posts : [];
}

/** getBlogPost reads one post by API ID and surfaces server error messages when available. */
export async function getBlogPost(id: string): Promise<BlogPost> {
  const response = await fetch(apiUrl(`/api/plugins/blog/posts/${id}`), {
    credentials: "include",
    headers: { Accept: "application/json" }
  });
  await ensureBlogResponse(response, "文章读取失败");
  return response.json() as Promise<BlogPost>;
}

/** createBlogPost creates a post and relies on the API to validate slug, terms, status, and cover object keys. */
export async function createBlogPost(input: BlogPostInput): Promise<BlogPost> {
  const response = await apiFetch("/api/plugins/blog/posts", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  await ensureBlogResponse(response, "文章创建失败");
  return response.json() as Promise<BlogPost>;
}

/** updateBlogPost mutates post content and metadata through the authenticated blog plugin API. */
export async function updateBlogPost(id: string, input: BlogPostInput): Promise<BlogPost> {
  const response = await apiFetch(`/api/plugins/blog/posts/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  await ensureBlogResponse(response, "文章保存失败");
  return response.json() as Promise<BlogPost>;
}

/** deleteBlogPost permanently removes a post through the authenticated blog plugin API. */
export async function deleteBlogPost(id: string): Promise<void> {
  const response = await apiFetch(`/api/plugins/blog/posts/${id}`, {
    method: "DELETE",
    credentials: "include"
  });
  await ensureBlogResponse(response, "文章删除失败");
}

async function ensureBlogResponse(response: Response, fallback: string) {
  if (response.ok) {
    return;
  }
  let message = fallback;
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    message = body.error?.message ?? fallback;
  } catch {
    message = fallback;
  }
  if (response.status === 401) {
    message = "请先登录后再管理博客";
  }
  throw new Error(message);
}
