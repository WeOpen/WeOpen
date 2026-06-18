// Package devtools exposes the local-first developer tools plugin metadata.
package devtools

import (
	"context"
	"strconv"

	"github.com/WeOpen/WeOpen/platform/core/plugin"
)

// PluginID is the stable identifier for the developer tools plugin.
const PluginID = "devtools"

// Plugin exposes the backend-owned catalog for browser-safe developer tools.
type Plugin struct{}

// NewPlugin creates the developer tools plugin wrapper.
func NewPlugin() Plugin {
	return Plugin{}
}

// ID returns the stable plugin ID.
func (p Plugin) ID() string { return PluginID }

// Name returns the display name.
func (p Plugin) Name() string { return "Developer Tools" }

// Version returns the plugin version.
func (p Plugin) Version() string { return "0.1.0" }

// Manifest returns plugin metadata for the API and clients.
func (p Plugin) Manifest() plugin.Manifest {
	return plugin.Manifest{
		ID:          PluginID,
		Name:        p.Name(),
		Description: "Local-first JSON, encoding, time, UUID, JWT, hash, HMAC, and regex utilities.",
		Version:     p.Version(),
		Permissions: []plugin.Permission{},
		Navigation:  []plugin.NavItem{{Title: "Tools", Path: "/tools", Icon: "tools", Order: 20}},
	}
}

// RegisterRoutes has no side effects because API startup mounts the catalog route.
func (p Plugin) RegisterRoutes(plugin.Router, plugin.Dependencies) {}

// Migrate has no side effects because devtools owns no database tables in v1.
func (p Plugin) Migrate(context.Context, plugin.DB) error { return nil }

// Dashboard returns a summary widget for the local developer tools workspace.
func (p Plugin) Dashboard(context.Context, string) ([]plugin.Widget, error) {
	return []plugin.Widget{{
		ID:          "devtools-local",
		PluginID:    PluginID,
		Title:       "Developer tools",
		Value:       strconv.Itoa(availableToolCount()),
		Description: "Client-safe tools available; cron parser deferred pending dependency approval.",
		Status:      "neutral",
		Href:        "/tools",
	}}, nil
}
