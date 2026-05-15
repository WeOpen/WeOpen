import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { DomainAsset } from "../../shared/api/domains.ts";
import {
  certificateTone,
  formatCertificateSummary,
  summarizeDomainAssets
} from "./domain-utils.ts";

describe("domain UI utilities", () => {
  test("maps certificate expiry thresholds to UI tones", () => {
    assert.equal(certificateTone("expired"), "danger");
    assert.equal(certificateTone("under_7_days"), "danger");
    assert.equal(certificateTone("under_30_days"), "warning");
    assert.equal(certificateTone("valid"), "success");
    assert.equal(certificateTone("unchecked"), "neutral");
  });

  test("summarizes synced domains and certificate warnings", () => {
    const assets: DomainAsset[] = [
      asset("example.com", "valid"),
      asset("soon.example", "under_30_days"),
      asset("expired.example", "expired")
    ];

    const summary = summarizeDomainAssets(assets);

    assert.deepEqual(summary, {
      total: 3,
      active: 3,
      warnings: 2,
      providers: ["cloudflare"]
    });
  });

  test("formats readable certificate messages", () => {
    assert.equal(formatCertificateSummary(asset("example.com", "valid")), "90 days remaining");
    assert.equal(formatCertificateSummary(asset("soon.example", "under_7_days", 4)), "4 days remaining");
    assert.equal(formatCertificateSummary(asset("unchecked.example", "unchecked")), "Not checked yet");
  });
});

function asset(
  name: string,
  status: DomainAsset["certificate"]["status"],
  daysRemaining = 90
): DomainAsset {
  return {
    id: name,
    provider: "cloudflare",
    providerId: name,
    name,
    status: "active",
    nameServers: [],
    certificate: {
      status,
      daysRemaining,
      expiresAt: "2026-08-13T00:00:00.000Z",
      checkedAt: "2026-05-15T00:00:00.000Z"
    },
    createdAt: "2026-05-15T00:00:00.000Z",
    updatedAt: "2026-05-15T00:00:00.000Z",
    lastSyncedAt: "2026-05-15T00:00:00.000Z"
  };
}
