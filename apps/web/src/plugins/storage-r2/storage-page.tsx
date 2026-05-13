"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@weopen/ui";
import type { StorageObject, StorageVisibility } from "@/lib/storage-r2";
import {
  deleteStorageObject,
  listStorageObjects,
  setStorageVisibility,
  uploadStorageFile
} from "@/lib/storage-r2";
import { ObjectTable } from "./object-table";
import { UploadPanel } from "./upload-panel";

export function StoragePage() {
  const [objects, setObjects] = useState<StorageObject[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      try {
        const nextObjects = await listStorageObjects();
        if (!cancelled) {
          setObjects(nextObjects);
          setMessage("");
        }
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "文件列表读取失败");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalBytes = useMemo(() => {
    return objects.reduce((sum, object) => sum + object.size, 0);
  }, [objects]);
  const publicCount = useMemo(() => {
    return objects.filter((object) => object.visibility === "public").length;
  }, [objects]);

  async function refresh() {
    setObjects(await listStorageObjects());
  }

  async function upload(file: File, visibility: StorageVisibility) {
    setIsUploading(true);
    setMessage("");
    try {
      const key = `uploads/${Date.now()}-${slugifyFilename(file.name)}`;
      await uploadStorageFile(
        {
          key,
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          size: file.size,
          visibility
        },
        file
      );
      await refresh();
      setMessage("文件已上传并完成索引");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "文件上传失败");
    } finally {
      setIsUploading(false);
    }
  }

  async function remove(object: StorageObject) {
    if (!window.confirm(`删除 ${object.filename}？`)) {
      return;
    }
    setMessage("");
    try {
      await deleteStorageObject(object.id);
      await refresh();
      setMessage("文件已删除");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "文件删除失败");
    }
  }

  async function changeVisibility(object: StorageObject, visibility: StorageVisibility) {
    if (object.visibility === visibility) {
      return;
    }
    setMessage("");
    try {
      await setStorageVisibility(object.id, visibility);
      await refresh();
      setMessage("可见性已更新");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "可见性保存失败");
    }
  }

  return (
    <section className="storage-workspace">
      <div className="page-header">
        <div className="page-kicker">R2 Storage</div>
        <h1 className="page-title">云存储</h1>
        <p className="page-description">
          用预签名 URL 直传 R2，平台保存对象索引、可见性和临时下载入口。
        </p>
      </div>

      <div className="storage-stats">
        <Card title="对象数" description={isLoading ? "读取中" : `${objects.length} 个`} />
        <Card title="总大小" description={formatBytes(totalBytes)} />
        <Card title="公开对象" description={`${publicCount} 个`} />
      </div>

      {message ? <p className="form-message">{message}</p> : null}

      <div className="storage-layout">
        <UploadPanel isUploading={isUploading} keyPrefix="uploads" onUpload={upload} />
        <ObjectTable
          objects={objects}
          onDelete={remove}
          onVisibilityChange={changeVisibility}
        />
      </div>
    </section>
  );
}

function slugifyFilename(name: string) {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatBytes(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
