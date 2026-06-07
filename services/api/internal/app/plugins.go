package app

import (
	"context"

	"github.com/WeOpen/WeOpen/internal/core/plugin"
	"github.com/WeOpen/WeOpen/internal/plugins/blog"
	"github.com/WeOpen/WeOpen/internal/plugins/devtools"
	domainplugin "github.com/WeOpen/WeOpen/internal/plugins/domains"
	storage "github.com/WeOpen/WeOpen/internal/plugins/storage_r2"
	apihttp "github.com/WeOpen/WeOpen/services/api/internal/adapters/http"
	"github.com/WeOpen/WeOpen/services/api/internal/domain/audit"
)

func builtinPluginRoutes(blogService *blog.Service, storageService *storage.Service, domainService *domainplugin.Service) []apihttp.PluginRoute {
	return []apihttp.PluginRoute{
		{
			Prefix:      "/api/plugins/blog",
			Handler:     blog.NewHTTPHandler(blogService),
			Permissions: []plugin.Permission{plugin.PermissionBlogRead},
			PermissionRules: []apihttp.PermissionRule{
				{Method: "GET", Path: "/posts", Permissions: []plugin.Permission{plugin.PermissionBlogRead}},
				{Method: "GET", Path: "/posts/*", Permissions: []plugin.Permission{plugin.PermissionBlogRead}},
				{Method: "POST", Path: "/posts", Permissions: []plugin.Permission{plugin.PermissionBlogWrite}},
				{Method: "PATCH", Path: "/posts/*", Permissions: []plugin.Permission{plugin.PermissionBlogWrite}},
				{Method: "DELETE", Path: "/posts/*", Permissions: []plugin.Permission{plugin.PermissionBlogWrite}},
			},
		},
		{
			Prefix:      "/api/plugins/storage-r2",
			Handler:     storage.NewHTTPHandler(storageService),
			Permissions: []plugin.Permission{plugin.PermissionStorageRead},
			PermissionRules: []apihttp.PermissionRule{
				{Method: "GET", Path: "/objects", Permissions: []plugin.Permission{plugin.PermissionStorageRead}},
				{Method: "POST", Path: "/upload-url", Permissions: []plugin.Permission{plugin.PermissionStorageWrite}},
				{Method: "POST", Path: "/objects/complete", Permissions: []plugin.Permission{plugin.PermissionStorageWrite}},
				{Method: "PATCH", Path: "/objects/*", Permissions: []plugin.Permission{plugin.PermissionStorageWrite}},
				{Method: "DELETE", Path: "/objects/*", Permissions: []plugin.Permission{plugin.PermissionStorageWrite}},
			},
		},
		{
			Prefix:      "/api/plugins/domains",
			Handler:     domainplugin.NewHTTPHandler(domainService),
			Permissions: []plugin.Permission{plugin.PermissionDomainRead},
			PermissionRules: []apihttp.PermissionRule{
				{Method: "GET", Path: "/assets", Permissions: []plugin.Permission{plugin.PermissionDomainRead}},
				{Method: "GET", Path: "/assets/*", Permissions: []plugin.Permission{plugin.PermissionDomainRead}},
				{Method: "POST", Path: "/sync", Permissions: []plugin.Permission{plugin.PermissionDomainWrite}},
			},
		},
	}
}

func newBuiltinPluginRegistry(blogService *blog.Service, storageService *storage.Service, domainService *domainplugin.Service) *plugin.Registry {
	registry := plugin.NewRegistry()
	registry.MustRegister(blog.NewPlugin(blogService))
	registry.MustRegister(devtools.NewPlugin())
	registry.MustRegister(domainplugin.NewPlugin(domainService))
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

type domainsAuditRecorder struct {
	audit *audit.Service
}

func (r domainsAuditRecorder) RecordDomainEvent(ctx context.Context, event domainplugin.AuditEvent) error {
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
