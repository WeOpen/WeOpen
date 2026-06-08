package domains

import (
	"context"
	"testing"
	"time"

	domainprovider "github.com/WeOpen/WeOpen/internal/providers/domains"
)

func TestServiceSyncsProviderDomainsDNSAndCertificateRisk(t *testing.T) {
	t.Parallel()

	now := time.Date(2026, 5, 15, 9, 30, 0, 0, time.UTC)
	provider := &fakeProvider{
		domains: []domainprovider.DomainAsset{{
			Provider:    domainprovider.ProviderCloudflare,
			ProviderID:  "zone_1",
			Name:        "example.com",
			Status:      "active",
			NameServers: []string{"ns1.example.com", "ns2.example.com"},
		}},
		records: map[string][]domainprovider.DNSRecord{
			"zone_1": {{
				ProviderID: "record_1",
				Type:       "A",
				Name:       "www.example.com",
				Content:    "203.0.113.10",
				TTL:        300,
				Proxied:    true,
				Comment:    "website",
			}},
		},
	}
	checker := fakeCertificateChecker{status: CertificateStatus{
		Status:        CertificateStatusUnder30Days,
		ExpiresAt:     now.Add(20 * 24 * time.Hour),
		DaysRemaining: 20,
		CheckedAt:     now,
	}}
	audit := &recordingAudit{}
	service := NewService(NewMemoryRepository(), provider, checker, audit)
	service.now = func() time.Time { return now }

	result, err := service.Sync(context.Background(), "usr_admin")
	if err != nil {
		t.Fatalf("expected sync: %v", err)
	}
	if result.SyncedAssets != 1 || result.SyncedDNSRecords != 1 {
		t.Fatalf("expected one asset and DNS record, got %+v", result)
	}
	if len(result.Assets) != 1 {
		t.Fatalf("expected synced asset payload, got %+v", result.Assets)
	}
	asset := result.Assets[0]
	if asset.ID == "" || asset.Name != "example.com" || asset.ProviderID != "zone_1" {
		t.Fatalf("expected persisted domain asset, got %+v", asset)
	}
	if asset.Certificate.Status != CertificateStatusUnder30Days {
		t.Fatalf("expected certificate risk to be stored, got %+v", asset.Certificate)
	}

	records, err := service.ListDNSRecords(context.Background(), asset.ID)
	if err != nil {
		t.Fatalf("expected DNS records: %v", err)
	}
	if len(records) != 1 || records[0].DomainAssetID != asset.ID || records[0].Name != "www.example.com" {
		t.Fatalf("expected stored DNS snapshot, got %+v", records)
	}

	if len(audit.events) != 1 {
		t.Fatalf("expected one audit event, got %+v", audit.events)
	}
	if audit.events[0].Action != "domains.sync" || audit.events[0].PluginID != PluginID {
		t.Fatalf("expected domain sync audit event, got %+v", audit.events[0])
	}
}

func TestServiceRequiresConfiguredProviderForSync(t *testing.T) {
	t.Parallel()

	service := NewService(NewMemoryRepository(), nil, nil, nil)
	if _, err := service.Sync(context.Background(), "usr_admin"); err == nil {
		t.Fatal("expected missing provider error")
	}
}

type fakeProvider struct {
	domains []domainprovider.DomainAsset
	records map[string][]domainprovider.DNSRecord
}

func (f *fakeProvider) ListDomains(context.Context) ([]domainprovider.DomainAsset, error) {
	return append([]domainprovider.DomainAsset(nil), f.domains...), nil
}

func (f *fakeProvider) ListDNSRecords(_ context.Context, domain domainprovider.DomainAsset) ([]domainprovider.DNSRecord, error) {
	return append([]domainprovider.DNSRecord(nil), f.records[domain.ProviderID]...), nil
}

type fakeCertificateChecker struct {
	status CertificateStatus
}

func (f fakeCertificateChecker) CheckCertificate(context.Context, string) (CertificateStatus, error) {
	return f.status, nil
}

type recordingAudit struct {
	events []AuditEvent
}

func (r *recordingAudit) RecordDomainEvent(_ context.Context, event AuditEvent) error {
	r.events = append(r.events, event)
	return nil
}
