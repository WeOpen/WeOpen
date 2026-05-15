"use client";

import type { DomainAsset } from "../../shared/api/domains";
import {
  certificateStatusLabel,
  certificateTone,
  formatCertificateSummary
} from "./domain-utils";

type DomainDetailProps = {
  asset?: DomainAsset;
};

export function DomainDetail({ asset }: DomainDetailProps) {
  if (!asset) {
    return (
      <section className="domain-detail">
        <h2>选择域名</h2>
        <p className="domains-empty">同步后可查看 DNS、证书和 nameserver 状态。</p>
      </section>
    );
  }

  const tone = certificateTone(asset.certificate.status);

  return (
    <section className="domain-detail">
      <div className="domain-detail-header">
        <div>
          <h2>{asset.name}</h2>
          <p>
            {asset.provider} · {asset.status}
            {asset.type ? ` · ${asset.type}` : ""}
          </p>
        </div>
        <span className={`domain-badge domain-badge-${tone}`}>
          {certificateStatusLabel(asset.certificate.status)}
        </span>
      </div>

      <dl className="domain-meta-grid">
        <div>
          <dt>证书状态</dt>
          <dd>{formatCertificateSummary(asset)}</dd>
        </div>
        <div>
          <dt>证书到期</dt>
          <dd>{asset.certificate.expiresAt ? new Date(asset.certificate.expiresAt).toLocaleString() : "未检查"}</dd>
        </div>
        <div>
          <dt>最近同步</dt>
          <dd>{asset.lastSyncedAt ? new Date(asset.lastSyncedAt).toLocaleString() : "未同步"}</dd>
        </div>
        <div>
          <dt>Provider ID</dt>
          <dd>{asset.providerId}</dd>
        </div>
      </dl>

      <div className="domain-nameservers">
        <h3>Nameservers</h3>
        {asset.nameServers?.length ? (
          <ul>
            {asset.nameServers.map((nameserver) => (
              <li key={nameserver}>{nameserver}</li>
            ))}
          </ul>
        ) : (
          <p className="domains-empty">Provider 未返回 nameserver。</p>
        )}
      </div>

      <p className="domain-readonly-note">v1 为只读模式：DNS 写入、删除和批量替换均已禁用。</p>
    </section>
  );
}
