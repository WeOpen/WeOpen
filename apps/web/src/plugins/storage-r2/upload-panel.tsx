"use client";

import { useRef, useState } from "react";
import { Button } from "@weopen/ui";
import type { StorageVisibility } from "@/lib/storage-r2";

type UploadPanelProps = {
  isUploading: boolean;
  onUpload: (file: File, visibility: StorageVisibility) => Promise<void>;
};

export function UploadPanel({ isUploading, onUpload }: UploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [visibility, setVisibility] = useState<StorageVisibility>("private");
  const [isDragging, setIsDragging] = useState(false);

  async function uploadFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) {
      return;
    }
    await onUpload(file, visibility);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  return (
    <section
      className={isDragging ? "storage-upload storage-upload-active" : "storage-upload"}
      onDragLeave={() => setIsDragging(false)}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        void uploadFiles(event.dataTransfer.files);
      }}
    >
      <div>
        <div className="page-kicker">Upload</div>
        <h2>上传到 R2</h2>
        <p>文件会直接 PUT 到预签名 URL，API 只保存对象索引。</p>
      </div>
      <label className="ui-input-field">
        <span className="ui-input-label">可见性</span>
        <select
          className="ui-input"
          onChange={(event) => setVisibility(event.target.value as StorageVisibility)}
          value={visibility}
        >
          <option value="private">私有</option>
          <option value="public">公开</option>
        </select>
      </label>
      <input
        hidden
        onChange={(event) => void uploadFiles(event.target.files)}
        ref={inputRef}
        type="file"
      />
      <Button disabled={isUploading} onClick={() => inputRef.current?.click()} type="button">
        {isUploading ? "上传中" : "选择文件"}
      </Button>
    </section>
  );
}
