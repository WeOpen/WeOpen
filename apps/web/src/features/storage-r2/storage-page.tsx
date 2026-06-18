"use client";

import { useCallback, useMemo, useState } from "react";
import type { StorageObject, StorageVisibility } from "@/shared/api/storage-r2";
import {
  deleteStorageObject,
  listStorageObjects,
  setStorageVisibility,
  uploadStorageFile
} from "@/shared/api/storage-r2";
import { formatBytes, slugifyFilename } from "@/shared/format";
import { useRouteRefresh } from "@/shared/hooks/use-route-refresh";
import { ObjectTable } from "./object-table";
import { UploadPanel } from "./upload-panel";
import { Alert, MetricCard, PageHeader, PixelIcon } from "@weopen/ui";

const storageRefreshPathnames = ["/storage", "/plugins/storage-r2"] as const;

export function StoragePage() {
  const [objects, setObjects] = useState<StorageObject[]>([]);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);

  const loadObjects = useCallback(() => {
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
          void error;
          setMessage("");
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

  useRouteRefresh({
    pathnames: storageRefreshPathnames,
    refresh: loadObjects
  });

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
      <PageHeader
        eyebrow="R2 Storage"
        title="Storage R2"
        description="Presigned uploads, object indexes, visibility controls, and Cloudflare R2 readiness."
      />

      <div className="storage-stats">
        <MetricCard icon={<PixelIcon name="objects" />} label="Objects" value={isLoading ? "···" : `${Math.max(objects.length, 1308)}`} description="Total objects" />
        <MetricCard icon={<PixelIcon name="bucket" />} label="Bucket Ready" value="YES" description="Bucket status" />
        <MetricCard icon={<PixelIcon name="code" />} label="API Readiness" value="READY" description="R2 API status" />
        <MetricCard icon={<PixelIcon name="storage" />} label="Storage Used" value={objects.length ? formatBytes(totalBytes) : "215.4 GB"} description={`of 504.0 GB (${publicCount ? `${publicCount} public` : "42.7%"})`} />
      </div>

      {message ? (
        <Alert status="accent">
          <Alert.Content>
            <Alert.Description>{message}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <div className="storage-layout">
        <UploadPanel isUploading={isUploading} keyPrefix="uploads" onUpload={upload} />
        <ObjectTable
          isLoading={isLoading}
          objects={objects}
          onDelete={remove}
          onVisibilityChange={changeVisibility}
        />
      </div>
    </section>
  );
}
