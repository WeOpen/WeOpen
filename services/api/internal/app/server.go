package app

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/WeOpen/WeOpen/internal/plugins/blog"
	domainplugin "github.com/WeOpen/WeOpen/internal/plugins/domains"
	storage "github.com/WeOpen/WeOpen/internal/plugins/storage_r2"
	cloudflareprovider "github.com/WeOpen/WeOpen/internal/providers/cloudflare"
	r2provider "github.com/WeOpen/WeOpen/internal/providers/r2"
	apihttp "github.com/WeOpen/WeOpen/services/api/internal/adapters/http"
	"github.com/WeOpen/WeOpen/services/api/internal/adapters/secrets"
	"github.com/WeOpen/WeOpen/services/api/internal/config"
	"github.com/WeOpen/WeOpen/services/api/internal/domain/audit"
	"github.com/WeOpen/WeOpen/services/api/internal/domain/auth"
)

// NewHTTPServer wires the API application services and returns the configured HTTP server.
func NewHTTPServer(cfg config.Config) (*http.Server, error) {
	authStore, err := auth.NewMemoryStore(cfg.AdminEmail, cfg.AdminPassword)
	if err != nil {
		return nil, fmt.Errorf("initialize auth store: %w", err)
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
		return nil, fmt.Errorf("initialize r2 provider: %w", err)
	}
	storageService := storage.NewService(storage.NewMemoryRepository(), r2Client, storageAuditRecorder{audit: auditService})
	blogService := blog.NewServiceWithCoverValidator(blog.NewMemoryRepository(), blogAuditRecorder{audit: auditService}, storageService)
	cloudflareClient, err := cloudflareprovider.NewClientWithTokenSource(cloudflareprovider.Config{}, cloudflareTokenSource{
		secrets:  secretService,
		fallback: cfg.CloudflareAPIToken,
	})
	if err != nil {
		return nil, fmt.Errorf("initialize cloudflare provider: %w", err)
	}
	domainService := domainplugin.NewService(
		domainplugin.NewMemoryRepository(),
		cloudflareClient,
		domainplugin.NewTLSCertificateChecker(),
		domainsAuditRecorder{audit: auditService},
	)
	pluginRegistry := newBuiltinPluginRegistry(blogService, storageService, domainService)

	return &http.Server{
		Addr: cfg.Addr,
		Handler: apihttp.NewServer(apihttp.ServerOptions{
			WebOrigin:     cfg.WebOrigin,
			Auth:          authService,
			Secrets:       secretService,
			Audit:         auditService,
			Plugins:       pluginRegistry,
			PluginRoutes:  builtinPluginRoutes(blogService, storageService, domainService),
			SecureCookies: cfg.IsProductionLike(),
		}),
		ReadHeaderTimeout: 5 * time.Second,
	}, nil
}

type cloudflareTokenSource struct {
	secrets  *secrets.Service
	fallback string
}

func (s cloudflareTokenSource) Token(ctx context.Context) (string, error) {
	if s.secrets != nil {
		token, err := s.secrets.Reveal(ctx, "cloudflare", "api-token")
		if err == nil && strings.TrimSpace(token) != "" {
			return token, nil
		}
	}
	return strings.TrimSpace(s.fallback), nil
}
