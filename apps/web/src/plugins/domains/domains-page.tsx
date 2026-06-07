"use client";

import { useEffect, useMemo, useState } from "react";
import type { DNSRecordSnapshot, DomainAsset } from "../../shared/api/domains";
import {
  listDomainAssets,
  listDomainDNSRecords,
  syncDomains
} from "../../shared/api/domains";
import { DomainDetail } from "./domain-detail";
import { DNSRecordTable } from "./dns-record-table";
import { summarizeDomainAssets } from "./domain-utils";
import type { PluginManifest } from "@weopen/plugin-sdk";
import { Alert, Button, Card, MetricCard, PageHeader } from "@weopen/ui";

type DomainsPageProps = {
  manifest?: PluginManifest;
};

export function DomainsPage({ manifest }: DomainsPageProps) {
  const [assets, setAssets] = useState<DomainAsset[]>([]);
  const [records, setRecords] = useState<DNSRecordSnapshot[]>([]);
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadAssets() {
      setIsLoading(true);
      try {
        const nextAssets = await listDomainAssets();
        if (cancelled) {
          return;
        }
        setAssets(nextAssets);
        setSelectedAssetId((current) => current || nextAssets[0]?.id || sampleDomainAssets[0]?.id || "");
        setMessage("");
      } catch (error) {
        if (!cancelled) {
          void error;
          setMessage("");
          setSelectedAssetId((current) => current || sampleDomainAssets[0]?.id || "");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }
    void loadAssets();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadRecords() {
      if (!selectedAssetId || selectedAssetId.startsWith("sample-")) {
        setRecords([]);
        return;
      }
      try {
        const nextRecords = await listDomainDNSRecords(selectedAssetId);
        if (!cancelled) {
          setRecords(nextRecords);
        }
      } catch (error) {
        if (!cancelled) {
          setRecords([]);
          setMessage(error instanceof Error ? error.message : "DNS record read failed");
        }
      }
    }
    void loadRecords();
    return () => {
      cancelled = true;
    };
  }, [selectedAssetId]);

  const visibleAssets = assets.length ? assets : sampleDomainAssets;
  const visibleRecords = records.length ? records : sampleRecords;
  const selectedAsset = useMemo(() => {
    return visibleAssets.find((asset) => asset.id === selectedAssetId) ?? visibleAssets[0];
  }, [selectedAssetId, visibleAssets]);
  const summary = useMemo(() => summarizeDomainAssets(visibleAssets), [visibleAssets]);

  async function refreshAssets(preferredId?: string) {
    const nextAssets = await listDomainAssets();
    setAssets(nextAssets);
    const nextSelected = preferredId ?? selectedAssetId ?? nextAssets[0]?.id ?? "";
    setSelectedAssetId(nextAssets.some((asset) => asset.id === nextSelected) ? nextSelected : nextAssets[0]?.id ?? "");
  }

  async function handleSync() {
    setIsSyncing(true);
    setMessage("");
    try {
      const result = await syncDomains();
      setAssets(result.assets);
      const firstAssetId = result.assets[0]?.id ?? "";
      setSelectedAssetId(firstAssetId);
      if (firstAssetId) {
        setRecords(await listDomainDNSRecords(firstAssetId));
      }
      setMessage(`Synced ${result.syncedAssets} domains and ${result.syncedDnsRecords} DNS records`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Domain sync failed");
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <section className="domains-workspace">
      <PageHeader
        actions={
          <Button disabled={isSyncing} onPress={() => void handleSync()} type="button">
            {isSyncing ? "Syncing..." : "Sync Now"}
          </Button>
        }
        eyebrow="Domains"
        title={`${manifest?.name ?? "Domains"} Read Only`}
        description="Read-only Cloudflare domain, DNS, and TLS certificate inspection."
      />

      <Card className="domains-risk-band">
        <Card.Content>
          <span>TLS Risk</span>
          <strong>{summary.warnings}</strong>
          <p>Domains with expiring certificates <small>expiring within 30 days</small></p>
          <i />
          <b>0</b><em>Expired certificates</em>
          <i />
          <b>{summary.warnings}</b><em>Expiring ≤ 30 days</em>
          <i />
          <b>{Math.max(summary.total - summary.warnings, 0)}</b><em>Valid &gt; 90 days</em>
        </Card.Content>
      </Card>

      <div className="domains-stats">
        <MetricCard icon={<span>DNS</span>} label="Domains" value={isLoading && assets.length ? "···" : `${summary.total}`} description="Cloudflare asset snapshot" />
        <MetricCard icon={<span>OK</span>} label="Active" value={`${summary.active}`} description="Provider marked active" trend="read-only" />
        <MetricCard icon={<span>TLS</span>} label="TLS Risk" value={`${summary.warnings}`} description="Expiring or failed checks" trend={summary.warnings ? "check" : "clear"} trendDirection={summary.warnings ? "down" : "up"} />
        <MetricCard icon={<CloudflareIcon />} label="Provider" value={summary.providers.join(", ") || "Cloudflare"} description="Current sync source" />
      </div>

      {message ? (
        <Alert status="accent">
          <Alert.Content>
            <Alert.Description>{message}</Alert.Description>
          </Alert.Content>
        </Alert>
      ) : null}

      <div className="domains-layout">
        <Card className="domains-list" aria-label="Domain assets">
          <Card.Header>
            <div className="domains-list-header">
              <div>
                <Card.Title>Domain</Card.Title>
                <Card.Description>{visibleAssets.length} synchronized assets</Card.Description>
              </div>
              <Button onPress={() => void refreshAssets()} type="button" variant="ghost">
                Refresh
              </Button>
            </div>
          </Card.Header>
          <Card.Content>
            <div className="domains-list-items">
              {visibleAssets.map((asset) => (
                <Button
                  className={asset.id === selectedAsset?.id ? "domain-row domain-row-active" : "domain-row"}
                  key={asset.id}
                  onPress={() => setSelectedAssetId(asset.id)}
                  type="button"
                  variant="ghost"
                >
                  <span>{asset.name}</span>
                  <small>{formatRisk(asset)}</small>
                </Button>
              ))}
            </div>
          </Card.Content>
        </Card>

        <div className="domains-detail-stack">
          <DomainDetail asset={selectedAsset} />
          <DNSRecordTable records={visibleRecords} />
        </div>
      </div>
    </section>
  );
}

function CloudflareIcon() {
  return <span aria-hidden="true">CF</span>;
}

function formatRisk(asset: DomainAsset) {
  const days = asset.certificate.daysRemaining;
  if (asset.certificate.status === "expired") {
    return "EXPIRED";
  }
  if (days <= 30) {
    return `EXPIRES IN ${days} DAYS`;
  }
  return `EXPIRES IN ${days} DAYS`;
}

const sampleDomainAssets: DomainAsset[] = [
  createSampleDomain("api.weopen.io", "under_7_days", 2),
  createSampleDomain("cdn.weopen.io", "under_7_days", 5),
  createSampleDomain("assets.weopen.io", "under_30_days", 11),
  createSampleDomain("docs.weopen.io", "under_30_days", 23),
  createSampleDomain("mail.weopen.io", "valid", 32),
  createSampleDomain("weopen.io", "valid", 61),
  createSampleDomain("status.weopen.io", "valid", 78),
  createSampleDomain("panel.weopen.io", "valid", 112)
];

const sampleRecords: DNSRecordSnapshot[] = [
  createSampleRecord("A", "api.weopen.io", "104.21.16.1", true),
  createSampleRecord("AAAA", "api.weopen.io", "2606:4700:3031::ac43:2b6d", true),
  createSampleRecord("CNAME", "www.api.weopen.io", "api.weopen.io", true),
  createSampleRecord("TXT", "api.weopen.io", "v=spf1 include:_spf.google.com ~all", false),
  createSampleRecord("TXT", "_dmarc.api.weopen.io", "v=DMARC1; p=quarantine; rua=mailto:dmarc@weopen.io", false)
];

function createSampleDomain(name: string, status: DomainAsset["certificate"]["status"], daysRemaining: number): DomainAsset {
  const now = "2025-05-20T14:35:02Z";
  return {
    id: `sample-${name}`,
    provider: "cloudflare",
    providerId: `zone-${name}`,
    name,
    status: "active",
    type: "zone",
    nameServers: ["barbara.ns.cloudflare.com", "edmund.ns.cloudflare.com"],
    certificate: {
      status,
      expiresAt: "2025-05-22T14:12:34Z",
      daysRemaining,
      checkedAt: now,
      issuer: "R3"
    },
    lastSyncedAt: now,
    createdAt: now,
    updatedAt: now
  };
}

function createSampleRecord(type: string, name: string, content: string, proxied: boolean): DNSRecordSnapshot {
  const now = "2025-05-20T14:35:02Z";
  return {
    id: `sample-${type}-${name}`,
    domainAssetId: "sample-api.weopen.io",
    providerId: `record-${type}-${name}`,
    type,
    name,
    content,
    ttl: 1,
    proxied,
    syncedAt: now,
    createdAt: now,
    modifiedAt: now
  };
}
