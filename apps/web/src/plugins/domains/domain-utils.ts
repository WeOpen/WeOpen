import type { CertificateRiskStatus, DomainAsset } from "../../shared/api/domains";

export type DomainTone = "neutral" | "success" | "warning" | "danger";

export type DomainSummary = {
  total: number;
  active: number;
  warnings: number;
  providers: string[];
};

export function certificateTone(status: CertificateRiskStatus): DomainTone {
  switch (status) {
    case "expired":
    case "under_7_days":
    case "check_failed":
      return "danger";
    case "under_30_days":
      return "warning";
    case "valid":
      return "success";
    default:
      return "neutral";
  }
}

export function summarizeDomainAssets(assets: DomainAsset[]): DomainSummary {
  const safeAssets = Array.isArray(assets) ? assets : [];
  const providers = Array.from(new Set(safeAssets.map((asset) => asset.provider))).sort();
  return {
    total: safeAssets.length,
    active: safeAssets.filter((asset) => asset.status === "active").length,
    warnings: safeAssets.filter((asset) => certificateTone(asset.certificate?.status ?? "unchecked") !== "success").length,
    providers
  };
}

export function formatCertificateSummary(asset: DomainAsset): string {
  const certificate = asset.certificate ?? { daysRemaining: 0, status: "unchecked" as const };
  switch (certificate.status) {
    case "unchecked":
      return "Not checked yet";
    case "check_failed":
      return certificate.error || "Certificate check failed";
    case "expired":
      return "Expired";
    default:
      return `${certificate.daysRemaining} days remaining`;
  }
}

export function certificateStatusLabel(status: CertificateRiskStatus): string {
  const labels: Record<CertificateRiskStatus, string> = {
    unchecked: "UNCHECKED",
    valid: "VALID",
    under_30_days: "EXPIRING SOON",
    under_7_days: "EXPIRING SOON",
    expired: "EXPIRED",
    check_failed: "CHECK FAILED"
  };
  return labels[status];
}
