package domains

import (
	"context"
	"fmt"
	"strings"
	"time"

	domainprovider "github.com/WeOpen/WeOpen/internal/providers/domains"
)

// AuditEvent is the domains plugin's audit shape.
type AuditEvent struct {
	ActorUserID string         `json:"actorUserId"`
	PluginID    string         `json:"pluginId"`
	Action      string         `json:"action"`
	TargetType  string         `json:"targetType"`
	TargetID    string         `json:"targetId,omitempty"`
	Metadata    map[string]any `json:"metadata"`
}

// AuditRecorder records domain sync events without coupling this plugin to the API module.
type AuditRecorder interface {
	RecordDomainEvent(ctx context.Context, event AuditEvent) error
}

// CertificateChecker reads TLS certificate expiry for a domain name.
type CertificateChecker interface {
	CheckCertificate(ctx context.Context, domain string) (CertificateStatus, error)
}

// SyncResult summarizes a read-only provider sync.
type SyncResult struct {
	Assets           []DomainAsset `json:"assets"`
	SyncedAssets     int           `json:"syncedAssets"`
	SyncedDNSRecords int           `json:"syncedDnsRecords"`
	SyncedAt         time.Time     `json:"syncedAt"`
}

// Service coordinates provider sync, DNS snapshots, certificate checks, and audit events.
type Service struct {
	repository Repository
	provider   domainprovider.DomainProvider
	checker    CertificateChecker
	audit      AuditRecorder
	now        func() time.Time
}

// NewService creates a domains service.
func NewService(repository Repository, provider domainprovider.DomainProvider, checker CertificateChecker, audit AuditRecorder) *Service {
	return &Service{
		repository: repository,
		provider:   provider,
		checker:    checker,
		audit:      audit,
		now:        time.Now,
	}
}

// ListAssets returns persisted domain inventory.
func (s *Service) ListAssets(ctx context.Context) ([]DomainAsset, error) {
	return s.repository.ListAssets(ctx)
}

// ListDNSRecords returns read-only DNS snapshots for a domain asset.
func (s *Service) ListDNSRecords(ctx context.Context, assetID string) ([]DNSRecordSnapshot, error) {
	return s.repository.ListDNSRecords(ctx, assetID)
}

// Sync reads domains and DNS records from the configured provider; it never writes DNS provider state.
func (s *Service) Sync(ctx context.Context, actorUserID string) (SyncResult, error) {
	if s.provider == nil {
		return SyncResult{}, ErrProviderNotConfigured
	}
	syncedAt := s.now().UTC()
	providerAssets, err := s.provider.ListDomains(ctx)
	if err != nil {
		return SyncResult{}, fmt.Errorf("%w: %v", ErrDomainSyncFailed, err)
	}

	assets := make([]DomainAsset, 0, len(providerAssets))
	for _, providerAsset := range providerAssets {
		asset := DomainAsset{
			Provider:     firstNonEmpty(providerAsset.Provider, domainprovider.ProviderCloudflare),
			ProviderID:   providerAsset.ProviderID,
			Name:         providerAsset.Name,
			Status:       providerAsset.Status,
			Type:         providerAsset.Type,
			NameServers:  append([]string(nil), providerAsset.NameServers...),
			LastSyncedAt: syncedAt,
			Certificate:  CertificateStatus{Status: CertificateStatusUnchecked, CheckedAt: syncedAt},
		}
		if s.checker != nil && strings.TrimSpace(asset.Name) != "" {
			certificate, err := s.checker.CheckCertificate(ctx, asset.Name)
			if err != nil {
				certificate = CertificateStatus{
					Status:    CertificateStatusCheckFailed,
					CheckedAt: syncedAt,
					Error:     "certificate check failed",
				}
			}
			if certificate.CheckedAt.IsZero() {
				certificate.CheckedAt = syncedAt
			}
			asset.Certificate = certificate
		}
		assets = append(assets, asset)
	}

	savedAssets, err := s.repository.UpsertAssets(ctx, assets)
	if err != nil {
		return SyncResult{}, err
	}

	totalRecords := 0
	for index, savedAsset := range savedAssets {
		providerAsset := providerAssets[index]
		records, err := s.provider.ListDNSRecords(ctx, providerAsset)
		if err != nil {
			return SyncResult{}, fmt.Errorf("%w: dns records for %s: %v", ErrDomainSyncFailed, savedAsset.Name, err)
		}
		snapshots := make([]DNSRecordSnapshot, 0, len(records))
		for _, record := range records {
			snapshots = append(snapshots, DNSRecordSnapshot{
				ProviderID: record.ProviderID,
				Type:       record.Type,
				Name:       record.Name,
				Content:    record.Content,
				TTL:        record.TTL,
				Proxied:    record.Proxied,
				Priority:   record.Priority,
				Comment:    record.Comment,
				SyncedAt:   syncedAt,
				CreatedAt:  record.CreatedAt,
				ModifiedAt: record.ModifiedAt,
			})
		}
		if err := s.repository.ReplaceDNSRecords(ctx, savedAsset.ID, snapshots); err != nil {
			return SyncResult{}, err
		}
		totalRecords += len(snapshots)
	}

	if err := s.record(ctx, AuditEvent{
		ActorUserID: actorUserID,
		PluginID:    PluginID,
		Action:      "domains.sync",
		TargetType:  "domain_asset",
		Metadata: map[string]any{
			"assets":     len(savedAssets),
			"dnsRecords": totalRecords,
		},
	}); err != nil {
		return SyncResult{}, err
	}

	return SyncResult{
		Assets:           savedAssets,
		SyncedAssets:     len(savedAssets),
		SyncedDNSRecords: totalRecords,
		SyncedAt:         syncedAt,
	}, nil
}

func (s *Service) record(ctx context.Context, event AuditEvent) error {
	if s.audit == nil {
		return nil
	}
	if event.Metadata == nil {
		event.Metadata = map[string]any{}
	}
	return s.audit.RecordDomainEvent(ctx, event)
}

func firstNonEmpty(value string, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}
