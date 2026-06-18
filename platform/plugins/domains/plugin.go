// Package domains implements the built-in read-only domain inventory plugin.
package domains

import (
	"context"
	"strconv"

	"github.com/WeOpen/WeOpen/platform/core/plugin"
)

// PluginID is the stable identifier for the domains plugin.
const PluginID = "domains"

// Plugin exposes domain inventory through the platform plugin contract.
type Plugin struct {
	service *Service
}

// NewPlugin creates the domains plugin wrapper.
func NewPlugin(service *Service) Plugin {
	return Plugin{service: service}
}

// ID returns the stable plugin ID.
func (p Plugin) ID() string { return PluginID }

// Name returns the display name.
func (p Plugin) Name() string { return "Domains" }

// Version returns the plugin version.
func (p Plugin) Version() string { return "0.1.0" }

// Manifest returns the plugin metadata consumed by API and Web.
func (p Plugin) Manifest() plugin.Manifest {
	return plugin.Manifest{
		ID:          PluginID,
		Name:        p.Name(),
		Description: "Read-only Cloudflare domain, DNS, and certificate risk monitoring; DNS writes are disabled in v1.",
		Version:     p.Version(),
		Permissions: []plugin.Permission{
			plugin.PermissionDomainRead,
			plugin.PermissionDomainWrite,
		},
		Navigation: []plugin.NavItem{{Title: "Domains", Path: "/domains", Icon: "domains", Order: 30}},
	}
}

// RegisterRoutes is reserved for future generic plugin route wiring.
func (p Plugin) RegisterRoutes(plugin.Router, plugin.Dependencies) {}

// Migrate is reserved for future plugin-owned migration execution.
func (p Plugin) Migrate(context.Context, plugin.DB) error { return nil }

// Dashboard returns domain inventory summary widgets without contacting providers.
func (p Plugin) Dashboard(ctx context.Context, _ string) ([]plugin.Widget, error) {
	assets, err := p.service.ListAssets(ctx)
	if err != nil {
		return nil, err
	}
	status := "neutral"
	for _, asset := range assets {
		switch asset.Certificate.Status {
		case CertificateStatusExpired, CertificateStatusUnder7Days:
			status = "danger"
		case CertificateStatusUnder30Days:
			if status != "danger" {
				status = "warning"
			}
		}
	}
	return []plugin.Widget{{
		ID:          "domains-watch",
		PluginID:    PluginID,
		Title:       "Domain Monitor",
		Value:       strconv.Itoa(len(assets)),
		Description: "Read-only domain and DNS assets",
		Status:      status,
		Href:        "/domains",
	}}, nil
}
