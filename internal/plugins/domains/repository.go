package domains

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"
)

var (
	ErrDomainNotFound        = errors.New("domain asset not found")
	ErrInvalidDomain         = errors.New("invalid domain asset")
	ErrProviderNotConfigured = errors.New("domain provider is not configured")
	ErrDomainSyncFailed      = errors.New("domain sync failed")
)

// CertificateRiskStatus classifies TLS certificate expiry for UI warnings.
type CertificateRiskStatus string

const (
	CertificateStatusUnchecked   CertificateRiskStatus = "unchecked"
	CertificateStatusValid       CertificateRiskStatus = "valid"
	CertificateStatusUnder30Days CertificateRiskStatus = "under_30_days"
	CertificateStatusUnder7Days  CertificateRiskStatus = "under_7_days"
	CertificateStatusExpired     CertificateRiskStatus = "expired"
	CertificateStatusCheckFailed CertificateRiskStatus = "check_failed"
)

// CertificateStatus is the browser-safe TLS certificate risk snapshot for a domain.
type CertificateStatus struct {
	Status        CertificateRiskStatus `json:"status"`
	ExpiresAt     time.Time             `json:"expiresAt,omitempty"`
	DaysRemaining int                   `json:"daysRemaining"`
	CheckedAt     time.Time             `json:"checkedAt,omitempty"`
	Issuer        string                `json:"issuer,omitempty"`
	Error         string                `json:"error,omitempty"`
}

// DomainAsset is a persisted domain inventory record.
type DomainAsset struct {
	ID           string            `json:"id"`
	Provider     string            `json:"provider"`
	ProviderID   string            `json:"providerId"`
	Name         string            `json:"name"`
	Status       string            `json:"status"`
	Type         string            `json:"type,omitempty"`
	NameServers  []string          `json:"nameServers,omitempty"`
	Certificate  CertificateStatus `json:"certificate"`
	LastSyncedAt time.Time         `json:"lastSyncedAt,omitempty"`
	CreatedAt    time.Time         `json:"createdAt"`
	UpdatedAt    time.Time         `json:"updatedAt"`
}

// DNSRecordSnapshot is the read-only DNS record state captured during sync.
type DNSRecordSnapshot struct {
	ID            string     `json:"id"`
	DomainAssetID string     `json:"domainAssetId"`
	ProviderID    string     `json:"providerId"`
	Type          string     `json:"type"`
	Name          string     `json:"name"`
	Content       string     `json:"content"`
	TTL           int        `json:"ttl"`
	Proxied       bool       `json:"proxied"`
	Priority      *int       `json:"priority,omitempty"`
	Comment       string     `json:"comment,omitempty"`
	SyncedAt      time.Time  `json:"syncedAt"`
	CreatedAt     *time.Time `json:"createdAt,omitempty"`
	ModifiedAt    *time.Time `json:"modifiedAt,omitempty"`
}

// Repository persists domain inventory and DNS snapshots.
type Repository interface {
	UpsertAssets(ctx context.Context, assets []DomainAsset) ([]DomainAsset, error)
	ListAssets(ctx context.Context) ([]DomainAsset, error)
	GetAsset(ctx context.Context, id string) (DomainAsset, error)
	ReplaceDNSRecords(ctx context.Context, assetID string, records []DNSRecordSnapshot) error
	ListDNSRecords(ctx context.Context, assetID string) ([]DNSRecordSnapshot, error)
}

// MemoryRepository stores domain inventory for local development and tests.
type MemoryRepository struct {
	mu           sync.RWMutex
	now          func() time.Time
	nextAssetID  int
	nextRecordID int
	assets       map[string]DomainAsset
	providerKeys map[string]string
	records      map[string][]DNSRecordSnapshot
}

// NewMemoryRepository creates an empty domain repository.
func NewMemoryRepository() *MemoryRepository {
	return &MemoryRepository{
		now:          time.Now,
		assets:       map[string]DomainAsset{},
		providerKeys: map[string]string{},
		records:      map[string][]DNSRecordSnapshot{},
	}
}

// UpsertAssets creates or updates domain inventory by provider identity.
func (r *MemoryRepository) UpsertAssets(_ context.Context, assets []DomainAsset) ([]DomainAsset, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := r.now()
	result := make([]DomainAsset, 0, len(assets))
	for _, asset := range assets {
		asset.Provider = strings.TrimSpace(asset.Provider)
		asset.ProviderID = strings.TrimSpace(asset.ProviderID)
		asset.Name = strings.TrimSpace(asset.Name)
		if asset.Provider == "" || asset.ProviderID == "" || asset.Name == "" {
			return nil, ErrInvalidDomain
		}
		key := providerKey(asset.Provider, asset.ProviderID)
		if existingID, exists := r.providerKeys[key]; exists {
			existing := r.assets[existingID]
			asset.ID = existing.ID
			asset.CreatedAt = existing.CreatedAt
		} else if asset.ID == "" {
			r.nextAssetID++
			asset.ID = fmt.Sprintf("dom_%06d", r.nextAssetID)
			asset.CreatedAt = now
		}
		if asset.Certificate.Status == "" {
			asset.Certificate.Status = CertificateStatusUnchecked
		}
		if asset.LastSyncedAt.IsZero() {
			asset.LastSyncedAt = now
		}
		asset.UpdatedAt = now
		r.assets[asset.ID] = cloneAsset(asset)
		r.providerKeys[key] = asset.ID
		result = append(result, cloneAsset(asset))
	}
	return result, nil
}

// ListAssets returns domain assets sorted by name.
func (r *MemoryRepository) ListAssets(_ context.Context) ([]DomainAsset, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	assets := make([]DomainAsset, 0, len(r.assets))
	for _, asset := range r.assets {
		assets = append(assets, cloneAsset(asset))
	}
	sort.Slice(assets, func(i, j int) bool {
		return assets[i].Name < assets[j].Name
	})
	return assets, nil
}

// GetAsset returns one domain asset by platform ID.
func (r *MemoryRepository) GetAsset(_ context.Context, id string) (DomainAsset, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	asset, ok := r.assets[id]
	if !ok {
		return DomainAsset{}, ErrDomainNotFound
	}
	return cloneAsset(asset), nil
}

// ReplaceDNSRecords replaces a domain's DNS snapshot after a provider sync.
func (r *MemoryRepository) ReplaceDNSRecords(_ context.Context, assetID string, records []DNSRecordSnapshot) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if _, ok := r.assets[assetID]; !ok {
		return ErrDomainNotFound
	}
	now := r.now()
	nextRecords := make([]DNSRecordSnapshot, 0, len(records))
	for _, record := range records {
		record.ProviderID = strings.TrimSpace(record.ProviderID)
		record.Type = strings.TrimSpace(record.Type)
		record.Name = strings.TrimSpace(record.Name)
		if record.ProviderID == "" || record.Type == "" || record.Name == "" {
			return ErrInvalidDomain
		}
		r.nextRecordID++
		record.ID = fmt.Sprintf("dns_%06d", r.nextRecordID)
		record.DomainAssetID = assetID
		if record.SyncedAt.IsZero() {
			record.SyncedAt = now
		}
		nextRecords = append(nextRecords, cloneRecord(record))
	}
	r.records[assetID] = nextRecords
	return nil
}

// ListDNSRecords returns read-only DNS snapshots for a domain asset.
func (r *MemoryRepository) ListDNSRecords(_ context.Context, assetID string) ([]DNSRecordSnapshot, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if _, ok := r.assets[assetID]; !ok {
		return nil, ErrDomainNotFound
	}
	records := append([]DNSRecordSnapshot(nil), r.records[assetID]...)
	sort.Slice(records, func(i, j int) bool {
		if records[i].Name == records[j].Name {
			return records[i].Type < records[j].Type
		}
		return records[i].Name < records[j].Name
	})
	for index := range records {
		records[index] = cloneRecord(records[index])
	}
	return records, nil
}

func providerKey(provider string, providerID string) string {
	return provider + ":" + providerID
}

func cloneAsset(asset DomainAsset) DomainAsset {
	asset.NameServers = append([]string(nil), asset.NameServers...)
	return asset
}

func cloneRecord(record DNSRecordSnapshot) DNSRecordSnapshot {
	if record.Priority != nil {
		priority := *record.Priority
		record.Priority = &priority
	}
	if record.CreatedAt != nil {
		createdAt := *record.CreatedAt
		record.CreatedAt = &createdAt
	}
	if record.ModifiedAt != nil {
		modifiedAt := *record.ModifiedAt
		record.ModifiedAt = &modifiedAt
	}
	return record
}
