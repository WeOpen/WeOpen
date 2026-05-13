"use client";

import { Button } from "@weopen/ui";
import type { StorageObject, StorageVisibility } from "@/lib/storage-r2";

type ObjectTableProps = {
  objects: StorageObject[];
  onDelete: (object: StorageObject) => Promise<void>;
  onVisibilityChange: (object: StorageObject, visibility: StorageVisibility) => Promise<void>;
};

export function ObjectTable({ objects, onDelete, onVisibilityChange }: ObjectTableProps) {
  if (!objects.length) {
    return <p className="storage-empty">还没有索引文件。先上传一个对象，或后续接入 R2 同步。</p>;
  }

  return (
    <div className="storage-table-wrap">
      <table className="storage-table">
        <thead>
          <tr>
            <th>文件</th>
            <th>大小</th>
            <th>可见性</th>
            <th>更新时间</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          {objects.map((object) => (
            <tr key={object.id}>
              <td>
                <strong>{object.filename}</strong>
                <span>{object.key}</span>
              </td>
              <td>{formatBytes(object.size)}</td>
              <td>
                <select
                  className="storage-visibility"
                  onChange={(event) =>
                    void onVisibilityChange(object, event.target.value as StorageVisibility)
                  }
                  value={object.visibility}
                >
                  <option value="private">私有</option>
                  <option value="public">公开</option>
                </select>
              </td>
              <td>{new Date(object.updatedAt).toLocaleString()}</td>
              <td>
                <div className="storage-actions">
                  {object.downloadUrl ? (
                    <a className="storage-download" href={object.downloadUrl}>
                      下载
                    </a>
                  ) : null}
                  <Button onClick={() => void onDelete(object)} type="button" variant="secondary">
                    删除
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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
