"use client";

import type { DNSRecordSnapshot } from "../../shared/api/domains";

type DNSRecordTableProps = {
  records: DNSRecordSnapshot[];
};

export function DNSRecordTable({ records }: DNSRecordTableProps) {
  if (!records.length) {
    return <p className="domains-empty">还没有 DNS 快照。同步域名后会显示记录。</p>;
  }

  return (
    <div className="domain-dns-table-wrap">
      <div className="domain-dns-header">
        <h2>DNS 记录</h2>
        <span>Read-only</span>
      </div>
      <table className="domain-dns-table">
        <thead>
          <tr>
            <th>类型</th>
            <th>名称</th>
            <th>内容</th>
            <th>TTL</th>
            <th>代理</th>
            <th>同步时间</th>
          </tr>
        </thead>
        <tbody>
          {records.map((record) => (
            <tr key={record.id}>
              <td>{record.type}</td>
              <td>
                <strong>{record.name}</strong>
                {record.comment ? <span>{record.comment}</span> : null}
              </td>
              <td>{record.content}</td>
              <td>{record.ttl}</td>
              <td>{record.proxied ? "是" : "否"}</td>
              <td>{new Date(record.syncedAt).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
