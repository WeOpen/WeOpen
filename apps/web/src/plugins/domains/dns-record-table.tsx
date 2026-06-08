"use client";

import { DataTable, EmptyState, StatusChip } from "@weopen/ui";
import type { DNSRecordSnapshot } from "../../shared/api/domains";

type DNSRecordTableProps = {
  records: DNSRecordSnapshot[];
};

export function DNSRecordTable({ records }: DNSRecordTableProps) {
  if (!records.length) {
    return (
      <EmptyState
        className="domain-dns-table-wrap"
        description="Records appear after a domain sync."
        title="No DNS snapshot"
      />
    );
  }

  return (
    <div className="domain-dns-table-wrap">
      <div className="domain-dns-header">
        <h2>DNS Records</h2>
        <StatusChip tone="warning">Read-only</StatusChip>
      </div>
      <DataTable
        aria-label="DNS records"
        columns={[
          {
            id: "type",
            label: "Type",
            render: (record) => <StatusChip tone="accent">{record.type}</StatusChip>
          },
          {
            id: "name",
            isRowHeader: true,
            label: "Name",
            render: (record) => (
              <div className="domain-record-cell">
                <strong>{record.name}</strong>
                {record.comment ? <span>{record.comment}</span> : null}
              </div>
            )
          },
          {
            id: "content",
            label: "Content",
            render: (record) => <code>{record.content}</code>
          },
          {
            id: "proxied",
            label: "Proxy",
            render: (record) => (record.proxied ? "PROXIED" : "DNS ONLY")
          },
          {
            id: "ttl",
            label: "TTL",
            render: (record) => (record.ttl === 1 ? "AUTO" : record.ttl)
          },
          {
            id: "status",
            label: "Status",
            render: () => "OK"
          }
        ]}
        getRowId={(record) => record.id}
        minWidth={880}
        rows={records}
      />
    </div>
  );
}
