package app

import (
	"context"

	"github.com/WeOpen/WeOpen/internal/core/plugin"
	"github.com/WeOpen/WeOpen/internal/plugins/blog"
	"github.com/WeOpen/WeOpen/internal/plugins/devtools"
	storage "github.com/WeOpen/WeOpen/internal/plugins/storage_r2"
	apihttp "github.com/WeOpen/WeOpen/services/api/internal/adapters/http"
	"github.com/WeOpen/WeOpen/services/api/internal/domain/audit"
)

func builtinPluginRoutes(blogService *blog.Service, storageService *storage.Service) []apihttp.PluginRoute {
	return []apihttp.PluginRoute{
		{
			Prefix:      "/api/plugins/blog",
			Handler:     blog.NewHTTPHandler(blogService),
			Permissions: []plugin.Permission{plugin.PermissionBlogRead},
		},
		{
			Prefix:      "/api/plugins/storage-r2",
			Handler:     storage.NewHTTPHandler(storageService),
			Permissions: []plugin.Permission{plugin.PermissionStorageRead},
		},
	}
}

func newBuiltinPluginRegistry(blogService *blog.Service, storageService *storage.Service) *plugin.Registry {
	registry := plugin.NewRegistry()
	registry.MustRegister(blog.NewPlugin(blogService))
	registry.MustRegister(devtools.NewPlugin())
	registry.MustRegister(plugin.NewStaticPlugin(plugin.Manifest{
		ID:          "domains",
		Name:        "域名管理",
		Description: "同步域名、DNS、证书状态和到期提醒。",
		Version:     "0.1.0",
		Permissions: []plugin.Permission{plugin.PermissionDomainRead},
		Navigation:  []plugin.NavItem{{Title: "域名", Path: "/domains", Icon: "globe", Order: 30}},
	}, plugin.Widget{ID: "domains-watch", PluginID: "domains", Title: "域名监控", Description: "只读域名同步插件占位", Href: "/domains"}))
	registry.MustRegister(storage.NewPlugin(storageService))
	return registry
}

type blogAuditRecorder struct {
	audit *audit.Service
}

func (r blogAuditRecorder) RecordBlogEvent(ctx context.Context, event blog.AuditEvent) error {
	_, err := r.audit.Record(ctx, audit.Entry{
		ActorUserID: event.ActorUserID,
		PluginID:    event.PluginID,
		Action:      event.Action,
		TargetType:  event.TargetType,
		TargetID:    event.TargetID,
		Metadata:    event.Metadata,
	})
	return err
}

type storageAuditRecorder struct {
	audit *audit.Service
}

func (r storageAuditRecorder) RecordStorageEvent(ctx context.Context, event storage.AuditEvent) error {
	_, err := r.audit.Record(ctx, audit.Entry{
		ActorUserID: event.ActorUserID,
		PluginID:    event.PluginID,
		Action:      event.Action,
		TargetType:  event.TargetType,
		TargetID:    event.TargetID,
		Metadata:    event.Metadata,
	})
	return err
}
