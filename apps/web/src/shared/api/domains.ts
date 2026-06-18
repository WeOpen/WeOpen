// Domain API calls read Cloudflare/manual inventory snapshots; v1 intentionally exposes no DNS writes.
import { apiFetch, apiUrl } from "./base";

/** CertificateRiskStatus mirrors backend TLS expiry warning thresholds. */
export type CertificateRiskStatus =
  | "unchecked"
  | "valid"
  | "under_30_days"
  | "under_7_days"
  | "expired"
  | "check_failed";

/** CertificateStatus is a browser-safe TLS certificate risk snapshot. */
export type CertificateStatus = {
  status: CertificateRiskStatus;
  expiresAt?: string;
  daysRemaining: number;
  checkedAt?: string;
  issuer?: string;
  error?: string;
};

/** DomainAsset is the synced provider-neutral domain inventory record. */
export type DomainAsset = {
  id: string;
  provider: string;
  providerId: string;
  name: string;
  status: string;
  type?: string;
  nameServers?: string[];
  certificate: CertificateStatus;
  lastSyncedAt?: string;
  createdAt: string;
  updatedAt: string;
};

/** DNSRecordSnapshot is a read-only DNS record captured during provider sync. */
export type DNSRecordSnapshot = {
  id: string;
  domainAssetId: string;
  providerId: string;
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied: boolean;
  priority?: number;
  comment?: string;
  syncedAt: string;
  createdAt?: string;
  modifiedAt?: string;
};

export type SyncDomainsResult = {
  assets: DomainAsset[];
  syncedAssets: number;
  syncedDnsRecords: number;
  syncedAt: string;
};

type AssetsResponse = {
  assets?: DomainAsset[] | null;
};

type DNSRecordsResponse = {
  records?: DNSRecordSnapshot[] | null;
};

type SyncDomainsWireResult = {
  assets?: DomainAsset[] | null;
  syncedAssets?: number | null;
  syncedDnsRecords?: number | null;
  syncedAt?: string | null;
};


/** listDomainAssets reads the latest synced domain inventory without contacting providers. */
export async function listDomainAssets(): Promise<DomainAsset[]> {
  const response = await fetch(apiUrl("/api/plugins/domains/assets"), {
    credentials: "include",
    headers: { Accept: "application/json" }
  });
  await ensureDomainResponse(response, "域名资产读取失败");
  const body = (await response.json()) as AssetsResponse;
  return normalizeDomainAssets(body.assets);
}

/** syncDomains asks the API to read Cloudflare inventory and refresh DNS/certificate snapshots. */
export async function syncDomains(): Promise<SyncDomainsResult> {
  const response = await apiFetch("/api/plugins/domains/sync", {
    method: "POST",
    credentials: "include",
    headers: { Accept: "application/json" }
  });
  await ensureDomainResponse(response, "域名同步失败");
  const body = (await response.json()) as SyncDomainsWireResult;
  const assets = normalizeDomainAssets(body.assets);
  return {
    assets,
    syncedAssets: body.syncedAssets ?? assets.length,
    syncedDnsRecords: body.syncedDnsRecords ?? 0,
    syncedAt: body.syncedAt ?? new Date().toISOString()
  };
}

/** listDomainDNSRecords reads stored DNS snapshots; DNS mutation is disabled in v1. */
export async function listDomainDNSRecords(assetId: string): Promise<DNSRecordSnapshot[]> {
  const response = await fetch(apiUrl(`/api/plugins/domains/assets/${assetId}/dns`), {
    credentials: "include",
    headers: { Accept: "application/json" }
  });
  await ensureDomainResponse(response, "DNS 记录读取失败");
  const body = (await response.json()) as DNSRecordsResponse;
  return Array.isArray(body.records) ? body.records : [];
}

async function ensureDomainResponse(response: Response, fallback: string) {
  if (response.ok) {
    return;
  }
  let message = fallback;
  try {
    const body = (await response.json()) as { error?: { message?: string } };
    message = body.error?.message ?? fallback;
  } catch {
    message = fallback;
  }
  if (response.status === 401) {
    message = "请先登录后再管理域名资产";
  }
  throw new Error(message);
}

function normalizeDomainAssets(assets: DomainAsset[] | null | undefined): DomainAsset[] {
  return Array.isArray(assets) ? assets.map(normalizeDomainAsset) : [];
}

function normalizeDomainAsset(asset: DomainAsset): DomainAsset {
  return {
    ...asset,
    certificate: {
      status: asset.certificate?.status ?? "unchecked",
      daysRemaining: asset.certificate?.daysRemaining ?? 0,
      checkedAt: asset.certificate?.checkedAt,
      error: asset.certificate?.error,
      expiresAt: asset.certificate?.expiresAt,
      issuer: asset.certificate?.issuer
    },
    nameServers: Array.isArray(asset.nameServers) ? asset.nameServers : []
  };
}
