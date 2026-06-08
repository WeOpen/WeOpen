"use client";

import { formatTimestamp } from "@/shared/format";
import type { DomainAsset } from "../../shared/api/domains";
import {
  certificateStatusLabel,
  certificateTone,
  formatCertificateSummary
} from "./domain-utils";
import { Card, EmptyState, StatusChip } from "@weopen/ui";

type DomainDetailProps = {
  asset?: DomainAsset;
};

export function DomainDetail({ asset }: DomainDetailProps) {
  if (!asset) {
    return (
      <EmptyState
        className="domain-detail"
        description="Sync domains to inspect DNS, certificates, and nameserver status."
        title="Select domain"
      />
    );
  }

  const tone = certificateTone(asset.certificate.status);

  return (
    <Card className="domain-detail">
      <Card.Header>
        <div className="domain-detail-header">
          <div>
            <Card.Title>{asset.name}</Card.Title>
            <Card.Description>
              {asset.provider} · {asset.status}
              {asset.type ? ` · ${asset.type}` : ""}
            </Card.Description>
          </div>
          <StatusChip tone={tone}>
            {certificateStatusLabel(asset.certificate.status)}
          </StatusChip>
        </div>
      </Card.Header>
      <Card.Content>
        <div className="domains-detail-cards">
          <section>
            <h3>Nameservers</h3>
            {asset.nameServers?.length ? (
              <ul>
                {asset.nameServers.map((nameserver) => (
                  <li key={nameserver}>{nameserver}</li>
                ))}
              </ul>
            ) : (
              <p className="domains-empty">Provider did not return nameservers.</p>
            )}
            <small>LAST SYNC {asset.lastSyncedAt ? formatTimestamp(asset.lastSyncedAt) : "NOT SYNCED"}</small>
          </section>
          <section>
            <h3>Certificate Summary</h3>
            <dl className="domain-meta-grid">
              <div><dt>Status</dt><dd>{formatCertificateSummary(asset)}</dd></div>
              <div><dt>Issuer</dt><dd>{asset.certificate.issuer ?? "Unknown"}</dd></div>
              <div><dt>Expires</dt><dd>{asset.certificate.expiresAt ? formatTimestamp(asset.certificate.expiresAt) : "Unchecked"}</dd></div>
              <div><dt>Days Left</dt><dd>{asset.certificate.daysRemaining} days</dd></div>
              <div><dt>Auto Renew</dt><dd>Enabled</dd></div>
            </dl>
          </section>
          <section>
            <h3>TLS / SSL</h3>
            <dl className="domain-meta-grid">
              <div><dt>Min TLS Version</dt><dd>TLS 1.2</dd></div>
              <div><dt>Cipher Suite</dt><dd>AEAD</dd></div>
              <div><dt>HSTS</dt><dd>Enabled</dd></div>
              <div><dt>OCSP Stapling</dt><dd>Enabled</dd></div>
              <div><dt>Verify Chain</dt><dd>OK</dd></div>
            </dl>
          </section>
        </div>
      </Card.Content>
    </Card>
  );
}
