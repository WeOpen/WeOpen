package app

import (
	"context"

	"github.com/WeOpen/WeOpen/platform/core/plugin"
	"github.com/WeOpen/WeOpen/platform/plugins/blog"
	"github.com/WeOpen/WeOpen/platform/plugins/devtools"
	domainplugin "github.com/WeOpen/WeOpen/platform/plugins/domains"
	storage "github.com/WeOpen/WeOpen/platform/plugins/storage_r2"
	apihttp "github.com/WeOpen/WeOpen/services/api/internal/adapters/http"
	"github.com/WeOpen/WeOpen/services/api/internal/domain/audit"
)

func builtinPluginRoutes(blogService *blog.Service, storageService *storage.Service, domainService *domainplugin.Service) []apihttp.PluginRoute {
	return []apihttp.PluginRoute{
		{
			Prefix:  "/api/plugins/devtools",
			Handler: devtools.NewHTTPHandler(),
			PermissionRules: []apihttp.PermissionRule{
				{Method: "GET", Path: "/tools", Permissions: nil},
			},
			Catalog: apihttp.RouteGroup{
				ID:          "plugin-devtools",
				Title:       "Developer Tools Plugin",
				Description: "Backend-owned catalog for browser-safe local utilities.",
				Routes: []apihttp.RouteDefinition{
					{
						ID:              "plugin.devtools.tools.list",
						Method:          "GET",
						Path:            "/api/plugins/devtools/tools",
						Summary:         "List developer tools and panel ordering.",
						Auth:            "Session",
						ResponseExample: map[string]any{"tools": []any{}, "panels": []any{}},
					},
				},
			},
		},
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
			Catalog: apihttp.RouteGroup{
				ID:          "plugin-blog",
				Title:       "Blog Plugin",
				Description: "Post publishing routes mounted behind plugin auth.",
				Routes: []apihttp.RouteDefinition{
					pluginRoute("plugin.blog.posts.list", "GET", "/api/plugins/blog/posts", "List blog posts.", []plugin.Permission{plugin.PermissionBlogRead}, []apihttp.RouteParameter{
						queryParam("status", false, "Filter by post status.", "published"),
					}, nil, map[string]any{"posts": []any{}}),
					pluginRoute("plugin.blog.posts.create", "POST", "/api/plugins/blog/posts", "Create a blog post.", []plugin.Permission{plugin.PermissionBlogWrite}, []apihttp.RouteParameter{
						bodyParam("title", true, "Post title.", "Launch notes"),
						bodyParam("slug", true, "URL slug.", "launch-notes"),
						bodyParam("excerpt", false, "Short excerpt.", "What changed this week."),
						bodyParam("content", true, "Markdown content.", "# Launch notes"),
						bodyParam("status", true, "Post status.", "draft"),
					}, map[string]string{"title": "Launch notes", "slug": "launch-notes", "content": "# Launch notes", "status": "draft"}, map[string]string{"id": "post_123", "status": "draft"}),
					pluginRoute("plugin.blog.posts.read", "GET", "/api/plugins/blog/posts/{postId}", "Read a blog post.", []plugin.Permission{plugin.PermissionBlogRead}, []apihttp.RouteParameter{
						pathParam("postId", "Post ID.", "post_123"),
					}, nil, map[string]string{"id": "post_123", "title": "Launch notes"}),
					pluginRoute("plugin.blog.posts.update", "PATCH", "/api/plugins/blog/posts/{postId}", "Update a blog post.", []plugin.Permission{plugin.PermissionBlogWrite}, []apihttp.RouteParameter{
						pathParam("postId", "Post ID.", "post_123"),
						bodyParam("title", false, "Post title.", "Launch notes"),
						bodyParam("status", false, "Post status.", "published"),
					}, map[string]string{"status": "published"}, map[string]string{"id": "post_123", "status": "published"}),
					pluginRoute("plugin.blog.posts.delete", "DELETE", "/api/plugins/blog/posts/{postId}", "Delete a blog post.", []plugin.Permission{plugin.PermissionBlogWrite}, []apihttp.RouteParameter{
						pathParam("postId", "Post ID.", "post_123"),
					}, nil, nil),
				},
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
			Catalog: apihttp.RouteGroup{
				ID:          "plugin-storage-r2",
				Title:       "Storage R2 Plugin",
				Description: "Object listing, upload, visibility, and delete routes.",
				Routes: []apihttp.RouteDefinition{
					pluginRoute("plugin.storage.objects.list", "GET", "/api/plugins/storage-r2/objects", "List storage objects.", []plugin.Permission{plugin.PermissionStorageRead}, nil, nil, map[string]any{"objects": []any{}}),
					pluginRoute("plugin.storage.upload.create", "POST", "/api/plugins/storage-r2/upload-url", "Create a presigned upload URL.", []plugin.Permission{plugin.PermissionStorageWrite}, []apihttp.RouteParameter{
						bodyParam("key", true, "Object key.", "images/cover.png"),
						bodyParam("contentType", true, "MIME type.", "image/png"),
						bodyParam("size", true, "Object size in bytes.", 204800),
						bodyParam("visibility", false, "Object visibility.", "private"),
					}, map[string]any{"key": "images/cover.png", "contentType": "image/png", "size": 204800, "visibility": "private"}, map[string]string{"uploadUrl": "https://...", "objectId": "obj_123"}),
					pluginRoute("plugin.storage.upload.complete", "POST", "/api/plugins/storage-r2/objects/complete", "Complete an uploaded object.", []plugin.Permission{plugin.PermissionStorageWrite}, []apihttp.RouteParameter{
						bodyParam("objectId", true, "Object ID from upload-url.", "obj_123"),
					}, map[string]string{"objectId": "obj_123"}, map[string]string{"id": "obj_123", "visibility": "private"}),
					pluginRoute("plugin.storage.objects.visibility", "PATCH", "/api/plugins/storage-r2/objects/{objectId}", "Update object visibility.", []plugin.Permission{plugin.PermissionStorageWrite}, []apihttp.RouteParameter{
						pathParam("objectId", "Object ID.", "obj_123"),
						bodyParam("visibility", true, "Object visibility.", "public"),
					}, map[string]string{"visibility": "public"}, map[string]string{"id": "obj_123", "visibility": "public"}),
					pluginRoute("plugin.storage.objects.delete", "DELETE", "/api/plugins/storage-r2/objects/{objectId}", "Delete an object.", []plugin.Permission{plugin.PermissionStorageWrite}, []apihttp.RouteParameter{
						pathParam("objectId", "Object ID.", "obj_123"),
					}, nil, nil),
				},
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
			Catalog: apihttp.RouteGroup{
				ID:          "plugin-domains",
				Title:       "Domains Plugin",
				Description: "Cloudflare domain asset and DNS snapshot routes.",
				Routes: []apihttp.RouteDefinition{
					pluginRoute("plugin.domains.assets.list", "GET", "/api/plugins/domains/assets", "List domain assets.", []plugin.Permission{plugin.PermissionDomainRead}, nil, nil, map[string]any{"assets": []any{}}),
					pluginRoute("plugin.domains.assets.dns", "GET", "/api/plugins/domains/assets/{assetId}/dns", "List DNS records for a domain asset.", []plugin.Permission{plugin.PermissionDomainRead}, []apihttp.RouteParameter{
						pathParam("assetId", "Domain asset ID.", "dom_123"),
					}, nil, map[string]any{"records": []any{}}),
					pluginRoute("plugin.domains.sync", "POST", "/api/plugins/domains/sync", "Sync domain assets from the provider.", []plugin.Permission{plugin.PermissionDomainWrite}, nil, nil, map[string]any{"synced": 2}),
				},
			},
		},
	}
}

func pluginRoute(id string, method string, path string, summary string, permissions []plugin.Permission, parameters []apihttp.RouteParameter, requestExample any, responseExample any) apihttp.RouteDefinition {
	return apihttp.RouteDefinition{
		ID:              id,
		Method:          method,
		Path:            path,
		Summary:         summary,
		Auth:            "Permission",
		Permissions:     permissions,
		Parameters:      parameters,
		RequestExample:  requestExample,
		ResponseExample: responseExample,
	}
}

func pathParam(name string, description string, example any) apihttp.RouteParameter {
	return apihttp.RouteParameter{Name: name, In: "path", Required: true, Description: description, Example: example}
}

func queryParam(name string, required bool, description string, example any) apihttp.RouteParameter {
	return apihttp.RouteParameter{Name: name, In: "query", Required: required, Description: description, Example: example}
}

func bodyParam(name string, required bool, description string, example any) apihttp.RouteParameter {
	return apihttp.RouteParameter{Name: name, In: "body", Required: required, Description: description, Example: example}
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
