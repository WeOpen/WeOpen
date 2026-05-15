"use client";

import { useEffect, useMemo, useState } from "react";
import { Button, Card } from "@weopen/ui";
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
        setSelectedAssetId((current) => current || nextAssets[0]?.id || "");
        setMessage("");
      } catch (error) {
        if (!cancelled) {
          setMessage(error instanceof Error ? error.message : "域名资产读取失败");
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
      if (!selectedAssetId) {
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
          setMessage(error instanceof Error ? error.message : "DNS 记录读取失败");
        }
      }
    }
    void loadRecords();
    return () => {
      cancelled = true;
    };
  }, [selectedAssetId]);

  const selectedAsset = useMemo(() => {
    return assets.find((asset) => asset.id === selectedAssetId) ?? assets[0];
  }, [assets, selectedAssetId]);
  const summary = useMemo(() => summarizeDomainAssets(assets), [assets]);

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
      setMessage(`已同步 ${result.syncedAssets} 个域名和 ${result.syncedDnsRecords} 条 DNS 记录`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "域名同步失败");
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <section className="domains-workspace">
      <div className="page-header domains-header">
        <div>
          <div className="page-kicker">Domains</div>
          <h1 className="page-title">{manifest?.name ?? "域名管理"}</h1>
          <p className="page-description">
            只读同步 Cloudflare 域名、DNS 记录和 TLS 证书到期风险。v1 禁止 DNS 写入，避免误改生产解析。
          </p>
        </div>
        <Button disabled={isSyncing} onClick={() => void handleSync()} type="button">
          {isSyncing ? "同步中..." : "同步 Cloudflare"}
        </Button>
      </div>

      <div className="domains-stats">
        <Card title="域名总数" description={isLoading ? "读取中" : `${summary.total} 个`} />
        <Card title="Active" description={`${summary.active} 个`} />
        <Card title="证书告警" description={`${summary.warnings} 个`} />
        <Card title="Provider" description={summary.providers.join(", ") || "未同步"} />
      </div>

      {message ? <p className="form-message">{message}</p> : null}

      <div className="domains-layout">
        <aside className="domains-list" aria-label="Domain assets">
          <div className="domains-list-header">
            <h2>域名资产</h2>
            <Button onClick={() => void refreshAssets()} type="button" variant="ghost">
              刷新
            </Button>
          </div>
          {assets.length ? (
            <div className="domains-list-items">
              {assets.map((asset) => (
                <button
                  className={
                    asset.id === selectedAsset?.id
                      ? "domain-row domain-row-active"
                      : "domain-row"
                  }
                  key={asset.id}
                  onClick={() => setSelectedAssetId(asset.id)}
                  type="button"
                >
                  <span>{asset.name}</span>
                  <small>
                    {asset.provider} · {asset.status}
                  </small>
                </button>
              ))}
            </div>
          ) : (
            <p className="domains-empty">还没有域名资产。配置 Cloudflare API Token 后点击同步。</p>
          )}
        </aside>

        <div className="domains-detail-stack">
          <DomainDetail asset={selectedAsset} />
          <DNSRecordTable records={records} />
        </div>
      </div>
    </section>
  );
}
