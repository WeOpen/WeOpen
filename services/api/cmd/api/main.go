package main

import (
	"errors"
	"log"
	"net/http"
	"time"

	"github.com/WeOpen/WeOpen/internal/core/plugin"
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
	pluginRegistry := newBuiltinPluginRegistry()

	server := &http.Server{
		Addr: cfg.Addr,
		Handler: apihttp.NewServer(apihttp.ServerOptions{
			WebOrigin: cfg.WebOrigin,
			Auth:      authService,
			Secrets:   secretService,
			Audit:     auditService,
			Plugins:   pluginRegistry,
		}),
		ReadHeaderTimeout: 5 * time.Second,
	}

	log.Printf("weopen-api listening on %s", cfg.Addr)
	if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		log.Fatalf("api server failed: %v", err)
	}
}

func newBuiltinPluginRegistry() *plugin.Registry {
	registry := plugin.NewRegistry()
	registry.MustRegister(plugin.NewStaticPlugin(plugin.Manifest{
		ID:          "blog",
		Name:        "博客管理",
		Description: "管理 Markdown 文章、草稿、标签和发布状态。",
		Version:     "0.1.0",
		Permissions: []plugin.Permission{plugin.PermissionBlogRead, plugin.PermissionBlogWrite},
		Navigation:  []plugin.NavItem{{Title: "博客", Path: "/blog", Icon: "file-text", Order: 10}},
	}, plugin.Widget{ID: "blog-drafts", PluginID: "blog", Title: "博客草稿", Description: "文章管理插件占位", Href: "/blog"}))
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
	registry.MustRegister(plugin.NewStaticPlugin(plugin.Manifest{
		ID:          "storage-r2",
		Name:        "云存储",
		Description: "管理 R2 对象、博客素材和备份文件。",
		Version:     "0.1.0",
		Permissions: []plugin.Permission{plugin.PermissionStorageRead, plugin.PermissionStorageWrite},
		Navigation:  []plugin.NavItem{{Title: "云存储", Path: "/storage", Icon: "hard-drive", Order: 40}},
	}, plugin.Widget{ID: "storage-objects", PluginID: "storage-r2", Title: "R2 文件", Description: "对象存储插件占位", Href: "/storage"}))
	return registry
}
