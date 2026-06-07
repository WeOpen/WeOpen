"use client";

import { useState } from "react";
import type { StorageVisibility } from "@/shared/api/storage-r2";
import { Card, FileDropzone, SelectField } from "@weopen/ui";

type UploadPanelProps = {
  isUploading: boolean;
  keyPrefix?: string;
  onUpload: (file: File, visibility: StorageVisibility) => Promise<void>;
};

export function UploadPanel({ isUploading, keyPrefix = "uploads", onUpload }: UploadPanelProps) {
  const [visibility, setVisibility] = useState<StorageVisibility>("private");

  async function uploadFile(file: File) {
    if (file.size <= 0) {
      window.alert("请选择非空文件。");
      return;
    }
    await onUpload(file, visibility);
  }

  return (
    <Card className="storage-upload">
      <Card.Header>
          <div>
            <div className="page-kicker">Upload</div>
          <Card.Title>Upload</Card.Title>
          <Card.Description>Objects PUT through presigned URLs. Current key prefix: {keyPrefix}/</Card.Description>
        </div>
      </Card.Header>
      <Card.Content>
        <div className="storage-upload-stack">
          <SelectField
            label="Visibility"
            onChange={(value) => setVisibility(value as StorageVisibility)}
            options={[
              { label: "Private", value: "private" },
              { label: "Public", value: "public" }
            ]}
            value={visibility}
          />
          <FileDropzone
            buttonLabel="Select File"
            disabled={isUploading}
            isBusy={isUploading}
            onFileSelect={(file) => void uploadFile(file)}
            title={isUploading ? "Uploading" : "Drag & drop files here"}
          />
        </div>
      </Card.Content>
    </Card>
  );
}
