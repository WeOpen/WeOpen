package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/WeOpen/WeOpen/internal/core/plugin"
	"github.com/WeOpen/WeOpen/internal/plugins/blog"
	storage "github.com/WeOpen/WeOpen/internal/plugins/storage_r2"
	r2provider "github.com/WeOpen/WeOpen/internal/providers/r2"
	"github.com/WeOpen/WeOpen/services/api/internal/audit"
	"github.com/WeOpen/WeOpen/services/api/internal/auth"
	"github.com/WeOpen/WeOpen/services/api/internal/config"
	apihttp "github.com/WeOpen/WeOpen/services/api/internal/http"
	"github.com/WeOpen/WeOpen/services/api/internal/secrets"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("invalid configuration: %v", err)
	}
	authStore, err := auth.NewMemoryStore(cfg.AdminEmail, cfg.AdminPassword)
	if err != nil {
		log.Fatalf("initialize auth store: %v", err)
	}
	authService := auth.NewService(authStore)
	secretService := secrets.NewService(secrets.NewMemoryStore(), secrets.NewCrypto(cfg.SecretEncryptionKey))
	auditService := audit.NewService()

	r2Client, err := r2provider.NewClient(r2provider.Config{
		AccountID:       cfg.R2AccountID,
		Bucket:          cfg.R2Bucket,
		AccessKeyID:     cfg.R2AccessKeyID,
		SecretAccessKey: cfg.R2SecretAccessKey,
	})
	if err != nil {
		log.Fatalf("initialize r2 provider: %v", err)
	}
	storageService := storage.NewService(storage.NewMemoryRepository(), r2Client, storageAuditRecorder{audit: auditService})
	blogService := blog.NewServiceWithCoverValidator(blog.NewMemoryRepository(), blogAuditRecorder{audit: auditService}, storageService)
	pluginRegistry := newBuiltinPluginRegistry(blogService, storageService)

	server := &http.Server{
		Addr: cfg.Addr,
		Handler: apihttp.NewServer(apihttp.ServerOptions{
			WebOrigin: cfg.WebOrigin,
			Auth:      authService,
			Secrets:   secretService,
			Audit:     auditService,
			Plugins:   pluginRegistry,
			PluginRoutes: []apihttp.PluginRoute{
				{Prefix: "/api/plugins/blog", Handler: blog.NewHTTPHandler(blogService)},
				{Prefix: "/api/plugins/storage-r2", Handler: storage.NewHTTPHandler(storageService)},
			},
		}),
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("weopen-api listening on %s", cfg.Addr)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("api server failed: %v", err)
	}
}

func newBuiltinPluginRegistry(blogService *blog.Service, storageService *storage.Service) *plugin.Registry {
	registry := plugin.NewRegistry()
	registry.MustRegister(blog.NewPlugin(blogService))
	registry.MustRegister(plugin.NewStaticPlugin(plugin.Manifest{
		ID:          "devtools",
		Name:        "程序员工具",
		Description: "提供 JSON、JWT、Base64、时间戳等常用工具。",
		Version:     "0.1.0",
		Permissions: []plugin.Permission{},
		Navigation:  []plugin.NavItem{{Title: "工具箱", Path: "/tools", Icon: "wrench", Order: 20}},
	}, plugin.Widget{ID: "devtools-local", PluginID: "devtools", Title: "工具箱", Description: "本地优先工具插件占位", Href: "/tools"}))
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
