// Package blog implements the built-in blog plugin, including article state, audit events, and cover validation through storage.
package blog

import (
	"context"
	"strconv"

	"github.com/WeOpen/WeOpen/internal/core/plugin"
)

// PluginID is the stable identifier for the blog plugin.
const PluginID = "blog"

// Plugin exposes the blog feature through the platform plugin contract.
type Plugin struct {
	service *Service
}

// NewPlugin creates the blog plugin contract wrapper.
func NewPlugin(service *Service) Plugin {
	return Plugin{service: service}
}

// ID returns the stable plugin ID.
func (p Plugin) ID() string { return PluginID }

// Name returns the display name.
func (p Plugin) Name() string { return "博客管理" }

// Version returns the plugin version.
func (p Plugin) Version() string { return "0.1.0" }

// Manifest returns the plugin metadata consumed by API and Web.
func (p Plugin) Manifest() plugin.Manifest {
	return plugin.Manifest{
		ID:          PluginID,
		Name:        p.Name(),
		Description: "管理 Markdown 文章、草稿、标签和发布状态。",
		Version:     p.Version(),
		Permissions: []plugin.Permission{
			plugin.PermissionBlogRead,
			plugin.PermissionBlogWrite,
		},
		Navigation: []plugin.NavItem{{Title: "博客", Path: "/blog", Icon: "file-text", Order: 10}},
	}
}

// RegisterRoutes is reserved for future generic plugin route wiring.
func (p Plugin) RegisterRoutes(plugin.Router, plugin.Dependencies) {}

// Migrate is reserved for future plugin-owned migration execution.
func (p Plugin) Migrate(context.Context, plugin.DB) error { return nil }

// Dashboard returns blog dashboard summary widgets.
func (p Plugin) Dashboard(ctx context.Context, _ string) ([]plugin.Widget, error) {
	posts, err := p.service.ListPosts(ctx, ListPostsFilter{})
	if err != nil {
		return nil, err
	}
	return []plugin.Widget{{
		ID:          "blog-posts",
		PluginID:    PluginID,
		Title:       "博客文章",
		Value:       formatCount(len(posts)),
		Description: "已创建文章",
		Href:        "/blog",
	}}, nil
}

func formatCount(count int) string {
	return strconv.Itoa(count)
}
