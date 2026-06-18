import { headers } from "next/headers";
import { ApiDirectory } from "./api-directory";
import { backendApiUrl } from "@/shared/api/server-base";
import type { ApiRouteCatalog } from "@/shared/api/routes";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ApiPage() {
  const { catalog, error } = await loadInitialRouteCatalog();
  return <ApiDirectory initialCatalog={catalog} initialError={error} />;
}

async function loadInitialRouteCatalog(): Promise<{ catalog: ApiRouteCatalog | null; error?: string }> {
  const requestHeaders = await headers();
  const cookie = requestHeaders.get("cookie") ?? "";

  try {
    const response = await fetch(backendApiUrl("/api/routes"), {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        Cookie: cookie
      }
    });
    if (!response.ok) {
      return { catalog: null, error: await routeCatalogError(response) };
    }
    const body = (await response.json()) as ApiRouteCatalog;
    return { catalog: { groups: Array.isArray(body.groups) ? body.groups : [] } };
  } catch {
    return { catalog: null, error: "接口目录读取失败" };
  }
}

async function routeCatalogError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    return body.error?.message ?? "接口目录读取失败";
  } catch {
    return "接口目录读取失败";
  }
}
