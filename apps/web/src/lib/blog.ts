export type BlogPostStatus = "draft" | "published" | "archived";
export type BlogTermType = "category" | "tag";

export type BlogTerm = {
  id: string;
  name: string;
  slug: string;
  type: BlogTermType;
  createdAt: string;
  updatedAt: string;
};

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  summary: string;
  contentMarkdown: string;
  status: BlogPostStatus;
  terms: BlogTerm[];
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type BlogPostInput = {
  title: string;
  slug: string;
  summary: string;
  contentMarkdown: string;
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

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8080";

export async function listBlogPosts(status?: BlogPostStatus): Promise<BlogPost[]> {
  const url = new URL(`${API_BASE_URL}/api/plugins/blog/posts`);
  if (status) {
    url.searchParams.set("status", status);
  }
  const response = await fetch(url, {
    credentials: "include",
    headers: { Accept: "application/json" }
  });
  await ensureBlogResponse(response, "文章列表读取失败");
  const body = (await response.json()) as BlogPostsResponse;
  return body.posts;
}

export async function getBlogPost(id: string): Promise<BlogPost> {
  const response = await fetch(`${API_BASE_URL}/api/plugins/blog/posts/${id}`, {
    credentials: "include",
    headers: { Accept: "application/json" }
  });
  await ensureBlogResponse(response, "文章读取失败");
  return response.json() as Promise<BlogPost>;
}

export async function createBlogPost(input: BlogPostInput): Promise<BlogPost> {
  const response = await fetch(`${API_BASE_URL}/api/plugins/blog/posts`, {
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

export async function updateBlogPost(id: string, input: BlogPostInput): Promise<BlogPost> {
  const response = await fetch(`${API_BASE_URL}/api/plugins/blog/posts/${id}`, {
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

export async function deleteBlogPost(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/plugins/blog/posts/${id}`, {
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
