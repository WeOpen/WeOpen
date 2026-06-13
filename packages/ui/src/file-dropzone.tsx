"use client";

import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "./button";
import { PixelIcon } from "./pixel-icon";
import { cn } from "./utils";

export type FileDropzoneProps = {
  accept?: string;
  buttonLabel?: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  isBusy?: boolean;
  title: ReactNode;
  onFileSelect: (file: File) => void;
};

export function FileDropzone({
  accept,
  buttonLabel = "选择文件",
  description,
  disabled,
  isBusy,
  onFileSelect,
  title
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  function selectFile(files: FileList | null) {
    const file = files?.[0];
    if (file) {
      onFileSelect(file);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <div
      className={cn("weopen-file-dropzone", { "weopen-file-dropzone-active": isDragging })}
      onDragLeave={() => setIsDragging(false)}
      onDragOver={(event) => {
        event.preventDefault();
        if (!disabled) {
          setIsDragging(true);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        setIsDragging(false);
        if (!disabled) {
          selectFile(event.dataTransfer.files);
        }
      }}
    >
      <span className="weopen-file-dropzone-icon" aria-hidden="true"><PixelIcon name="upload" /></span>
      <div>
        <strong>{title}</strong>
        {description ? <p>{description}</p> : null}
      </div>
      <input
        accept={accept}
        disabled={disabled}
        hidden
        onChange={(event) => selectFile(event.currentTarget.files)}
        ref={inputRef}
        type="file"
      />
      <Button
        disabled={disabled || isBusy}
        onPress={() => inputRef.current?.click()}
        type="button"
        variant="secondary"
      >
        {isBusy ? "处理中" : buttonLabel}
      </Button>
    </div>
  );
}
