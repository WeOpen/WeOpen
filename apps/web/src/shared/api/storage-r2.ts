// Storage API calls coordinate API authorization, presigned R2 upload URLs, and object metadata indexing.
import { apiFetch, apiUrl } from "./base";

/** StorageVisibility controls whether the API may expose a public download URL. */
export type StorageVisibility = "private" | "public";

/** StorageObject is the browser-safe metadata record for an indexed R2 object. */
export type StorageObject = {
  id: string;
  key: string;
  filename: string;
  contentType: string;
  size: number;
  visibility: StorageVisibility;
  createdByUserId: string;
  downloadUrl?: string;
  createdAt: string;
  updatedAt: string;
};

/** CreateUploadInput describes an upload request before the API validates and signs it. */
export type CreateUploadInput = {
  key: string;
  filename: string;
  contentType: string;
  size: number;
  visibility: StorageVisibility;
};

type PresignedURL = {
  method: string;
  url: string;
  headers?: Record<string, string>;
  expires: string;
};

type UploadURLResponse = {
  key: string;
  uploadUrl: PresignedURL;
};

type ObjectsResponse = {
  objects: StorageObject[];
};


/** listStorageObjects reads object metadata; private object bytes are never returned by this call. */
export async function listStorageObjects(): Promise<StorageObject[]> {
  const response = await fetch(apiUrl("/api/plugins/storage-r2/objects"), {
    credentials: "include",
    headers: { Accept: "application/json" }
  });
  await ensureStorageResponse(response, "文件列表读取失败");
  const body = (await response.json()) as ObjectsResponse;
  return Array.isArray(body.objects) ? body.objects : [];
}

/** createUploadURL asks the API to validate metadata and sign a short-lived R2 upload URL. */
export async function createUploadURL(input: CreateUploadInput): Promise<UploadURLResponse> {
  const response = await apiFetch("/api/plugins/storage-r2/upload-url", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  await ensureStorageResponse(response, "上传链接创建失败");
  return response.json() as Promise<UploadURLResponse>;
}

/** completeStorageUpload records metadata after the browser PUT succeeds against the signed R2 URL. */
export async function completeStorageUpload(input: CreateUploadInput): Promise<StorageObject> {
  const response = await apiFetch("/api/plugins/storage-r2/objects/complete", {
    method: "POST",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });
  await ensureStorageResponse(response, "文件索引保存失败");
  return response.json() as Promise<StorageObject>;
}

/** uploadStorageFile performs the browser-to-R2 PUT, then asks the API to index the completed object. */
export async function uploadStorageFile(input: CreateUploadInput, file: File): Promise<StorageObject> {
  const upload = await createUploadURL(input);
  const putResponse = await fetch(upload.uploadUrl.url, {
    method: upload.uploadUrl.method,
    headers: upload.uploadUrl.headers ?? {},
    body: file
  });
  if (!putResponse.ok) {
    throw new Error(`R2 上传失败：${putResponse.status}`);
  }
  return completeStorageUpload({ ...input, key: upload.key });
}

/** setStorageVisibility changes whether the API exposes a public download URL for an indexed object. */
export async function setStorageVisibility(
  id: string,
  visibility: StorageVisibility
): Promise<StorageObject> {
  const response = await apiFetch(`/api/plugins/storage-r2/objects/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ visibility })
  });
  await ensureStorageResponse(response, "可见性保存失败");
  return response.json() as Promise<StorageObject>;
}

/** deleteStorageObject removes indexed metadata and any provider-backed object according to API rules. */
export async function deleteStorageObject(id: string): Promise<void> {
  const response = await apiFetch(`/api/plugins/storage-r2/objects/${id}`, {
    method: "DELETE",
    credentials: "include"
  });
  await ensureStorageResponse(response, "文件删除失败");
}

async function ensureStorageResponse(response: Response, fallback: string) {
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
    message = "请先登录后再管理云存储";
  }
  throw new Error(message);
}
