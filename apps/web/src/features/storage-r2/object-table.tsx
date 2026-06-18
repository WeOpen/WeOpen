"use client";

import { Button, ConfirmActionDialog, DataTable, SelectField, SkeletonStack } from "@weopen/ui";
import type { StorageObject, StorageVisibility } from "@/shared/api/storage-r2";
import { formatBytes, formatTimestamp } from "@/shared/format";

type ObjectTableProps = {
  isLoading?: boolean;
  objects: StorageObject[];
  onDelete: (object: StorageObject) => Promise<void>;
  onVisibilityChange: (object: StorageObject, visibility: StorageVisibility) => Promise<void>;
};

export function ObjectTable({ isLoading = false, objects, onDelete, onVisibilityChange }: ObjectTableProps) {
  if (isLoading && !objects.length) {
    return (
      <div aria-busy="true" className="weopen-data-table storage-table-wrap">
        <SkeletonStack rowHeight={52} rows={7} widths={["100%", "94%", "88%", "96%"]} />
      </div>
    );
  }

  const rows = objects.length ? objects : sampleObjects;

  return (
    <DataTable
      aria-label="R2 objects"
      className="storage-table-wrap"
      columns={[
        {
          id: "file",
          isRowHeader: true,
          label: "Filename",
          render: (object) => (
            <div className="storage-object-cell">
              <strong>{object.filename}</strong>
              <span>{object.key}</span>
            </div>
          )
        },
        {
          id: "size",
          label: "Size",
          render: (object) => formatBytes(object.size)
        },
        {
          id: "visibility",
          label: "Visibility",
          render: (object) => (
            <SelectField
              label="Visibility"
              disabled={isSampleObject(object)}
              onChange={(visibility) => void onVisibilityChange(object, visibility as StorageVisibility)}
              options={[
                { label: "Private", value: "private" },
                { label: "Public", value: "public" }
              ]}
              value={object.visibility}
            />
          )
        },
        {
          id: "updatedAt",
          label: "Updated",
          render: (object) => formatTimestamp(object.updatedAt)
        },
        {
          className: "storage-actions-column",
          id: "actions",
          label: "Actions",
          render: (object) => (
            <div className="storage-actions">
              {object.downloadUrl ? (
                <a className="storage-download" href={object.downloadUrl}>
                  Download
                </a>
              ) : null}
              <ConfirmActionDialog
                confirmLabel="Delete file"
                description={`Delete ${object.filename} and remove its object index.`}
                onConfirm={() => onDelete(object)}
                title="Delete file?"
                trigger={
                  <Button disabled={isSampleObject(object)} type="button" variant="danger-soft">
                    Delete
                  </Button>
                }
              />
            </div>
          )
        }
      ]}
      emptyTitle="No indexed files"
      getRowId={(object) => object.id}
      minWidth={860}
      rows={rows}
    />
  );
}

const sampleObjects: StorageObject[] = [
  createSampleObject("sample-report", "uploads/reports/report-2025-05.pdf", "report-2025-05.pdf", 1_580_320, "private", "2025-05-20T14:33:19Z"),
  createSampleObject("sample-invoice", "uploads/invoices/invoice-0421.csv", "invoice-0421.csv", 82_114, "private", "2025-05-20T14:28:47Z"),
  createSampleObject("sample-image", "uploads/images/product-image-001.jpg", "product-image-001.jpg", 4_512_000, "public", "2025-05-20T14:22:11Z"),
  createSampleObject("sample-arch", "uploads/diagrams/architecture-diagram.png", "architecture-diagram.png", 2_710_400, "public", "2025-05-20T14:18:36Z"),
  createSampleObject("sample-backup", "backups/2025-05-20/backup.tar.gz", "backups-2025-05-20.tar.gz", 83_120_001, "private", "2025-05-20T14:10:02Z"),
  createSampleObject("sample-notes", "docs/notes.txt", "notes.txt", 12_448, "private", "2025-05-20T13:59:55Z"),
  createSampleObject("sample-terms", "docs/legal/terms-of-service.pdf", "terms-of-service.pdf", 784_512, "public", "2025-05-20T13:45:31Z")
];

function createSampleObject(
  id: string,
  key: string,
  filename: string,
  size: number,
  visibility: StorageVisibility,
  updatedAt: string
): StorageObject {
  return {
    id,
    key,
    filename,
    contentType: "application/octet-stream",
    size,
    visibility,
    createdByUserId: "sample",
    createdAt: updatedAt,
    updatedAt
  };
}

function isSampleObject(object: StorageObject) {
  return object.id.startsWith("sample-");
}
