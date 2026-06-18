// Package domains defines provider-neutral domain inventory contracts.
package domains

import (
	"context"
	"time"
)

// ProviderCloudflare is the stable provider key for Cloudflare zone inventory.
const ProviderCloudflare = "cloudflare"

// DomainProvider reads domain assets and DNS records from an external provider.
type DomainProvider interface {
	ListDomains(ctx context.Context) ([]DomainAsset, error)
	ListDNSRecords(ctx context.Context, domain DomainAsset) ([]DNSRecord, error)
}

// DomainAsset is a provider-neutral domain or DNS zone returned by inventory providers.
type DomainAsset struct {
	Provider    string    `json:"provider"`
	ProviderID  string    `json:"providerId"`
	Name        string    `json:"name"`
	Status      string    `json:"status"`
	Type        string    `json:"type,omitempty"`
	NameServers []string  `json:"nameServers,omitempty"`
	SyncedAt    time.Time `json:"syncedAt,omitempty"`
}

// DNSRecord is a provider-neutral DNS record snapshot.
type DNSRecord struct {
	ProviderID string     `json:"providerId"`
	Type       string     `json:"type"`
	Name       string     `json:"name"`
	Content    string     `json:"content"`
	TTL        int        `json:"ttl"`
	Proxied    bool       `json:"proxied"`
	Priority   *int       `json:"priority,omitempty"`
	Comment    string     `json:"comment,omitempty"`
	CreatedAt  *time.Time `json:"createdAt,omitempty"`
	ModifiedAt *time.Time `json:"modifiedAt,omitempty"`
}
