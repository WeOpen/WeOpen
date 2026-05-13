package storage_r2

import (
	"context"
	"strconv"

	"github.com/WeOpen/WeOpen/internal/core/plugin"
)

// PluginID is the stable identifier for the R2 storage plugin.
const PluginID = "storage-r2"

// Plugin exposes R2 storage through the platform plugin contract.
type Plugin struct {
	service *Service
}

// NewPlugin creates the storage plugin wrapper.
func NewPlugin(service *Service) Plugin {
	return Plugin{service: service}
}

// ID returns the stable plugin ID.
func (p Plugin) ID() string { return PluginID }

// Name returns the display name.
func (p Plugin) Name() string { return "云存储" }

// Version returns the plugin version.
func (p Plugin) Version() string { return "0.1.0" }

// Manifest returns the plugin metadata consumed by API and Web.
func (p Plugin) Manifest() plugin.Manifest {
	return plugin.Manifest{
		ID:          PluginID,
		Name:        p.Name(),
		Description: "管理 R2 对象、博客素材和备份文件。",
		Version:     p.Version(),
		Permissions: []plugin.Permission{
			plugin.PermissionStorageRead,
			plugin.PermissionStorageWrite,
		},
		Navigation: []plugin.NavItem{{Title: "云存储", Path: "/storage", Icon: "hard-drive", Order: 40}},
	}
}

// RegisterRoutes is reserved for future generic plugin route wiring.
func (p Plugin) RegisterRoutes(plugin.Router, plugin.Dependencies) {}

// Migrate is reserved for future plugin-owned migration execution.
func (p Plugin) Migrate(context.Context, plugin.DB) error { return nil }

// Dashboard returns storage summary widgets.
func (p Plugin) Dashboard(ctx context.Context, _ string) ([]plugin.Widget, error) {
	objects, err := p.service.ListObjects(ctx)
	if err != nil {
		return nil, err
	}
	return []plugin.Widget{{
		ID:          "storage-objects",
		PluginID:    PluginID,
		Title:       "R2 文件",
		Value:       strconv.Itoa(len(objects)),
		Description: "已索引对象",
		Href:        "/storage",
	}}, nil
}
