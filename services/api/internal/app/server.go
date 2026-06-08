package app

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/WeOpen/WeOpen/internal/plugins/blog"
	domainplugin "github.com/WeOpen/WeOpen/internal/plugins/domains"
	storage "github.com/WeOpen/WeOpen/internal/plugins/storage_r2"
	cloudflareprovider "github.com/WeOpen/WeOpen/internal/providers/cloudflare"
	r2provider "github.com/WeOpen/WeOpen/internal/providers/r2"
	dbadapter "github.com/WeOpen/WeOpen/services/api/internal/adapters/db"
	apihttp "github.com/WeOpen/WeOpen/services/api/internal/adapters/http"
	"github.com/WeOpen/WeOpen/services/api/internal/adapters/secrets"
	"github.com/WeOpen/WeOpen/services/api/internal/config"
	"github.com/WeOpen/WeOpen/services/api/internal/domain/audit"
	"github.com/WeOpen/WeOpen/services/api/internal/domain/auth"
)

// databaseConnector opens a configured SQL database and returns its placeholder dialect plus a close hook.
type databaseConnector func(context.Context, config.Config) (*sql.DB, dbadapter.SQLDialect, func() error, error)

// NewHTTPServer wires the API application services and returns the configured HTTP server.
func NewHTTPServer(cfg config.Config) (*http.Server, error) {
	return newHTTPServerWithDatabaseConnector(cfg, connectConfiguredDatabase)
}

func newHTTPServerWithDatabaseConnector(cfg config.Config, connectDatabase databaseConnector) (*http.Server, error) {
	authStore, closeAuthDatabase, err := newAuthStore(context.Background(), cfg, connectDatabase)
	if err != nil {
		return nil, err
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
		closeAuthDatabaseIfNeeded(closeAuthDatabase)
		return nil, fmt.Errorf("initialize r2 provider: %w", err)
	}
	storageService := storage.NewService(storage.NewMemoryRepository(), r2Client, storageAuditRecorder{audit: auditService})
	blogService := blog.NewServiceWithCoverValidator(blog.NewMemoryRepository(), blogAuditRecorder{audit: auditService}, storageService)
	cloudflareClient, err := cloudflareprovider.NewClientWithTokenSource(cloudflareprovider.Config{}, cloudflareTokenSource{
		secrets:  secretService,
		fallback: cfg.CloudflareAPIToken,
	})
	if err != nil {
		closeAuthDatabaseIfNeeded(closeAuthDatabase)
		return nil, fmt.Errorf("initialize cloudflare provider: %w", err)
	}
	domainService := domainplugin.NewService(
		domainplugin.NewMemoryRepository(),
		cloudflareClient,
		domainplugin.NewTLSCertificateChecker(),
		domainsAuditRecorder{audit: auditService},
	)
	pluginRegistry := newBuiltinPluginRegistry(blogService, storageService, domainService)

	server := &http.Server{
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
	}
	if closeAuthDatabase != nil {
		server.RegisterOnShutdown(func() { _ = closeAuthDatabase() })
	}
	return server, nil
}

func closeAuthDatabaseIfNeeded(closeAuthDatabase func() error) {
	if closeAuthDatabase != nil {
		_ = closeAuthDatabase()
	}
}

func newAuthStore(ctx context.Context, cfg config.Config, connectDatabase databaseConnector) (auth.Store, func() error, error) {
	if strings.TrimSpace(cfg.DatabaseURL) == "" {
		authStore, err := auth.NewMemoryStore(cfg.AdminEmail, cfg.AdminPassword)
		if err != nil {
			return nil, nil, fmt.Errorf("initialize memory auth store: %w", err)
		}
		return authStore, nil, nil
	}

	database, dialect, closeDatabase, err := connectDatabase(ctx, cfg)
	if err != nil {
		return nil, nil, fmt.Errorf("connect auth database: %w", err)
	}
	if err := applyConfiguredMigrations(ctx, database, cfg.MigrationsDir); err != nil {
		_ = closeDatabase()
		return nil, nil, err
	}
	authStore := dbadapter.NewSQLAuthStore(database, dbadapter.WithSQLDialect(dialect))
	if err := authStore.EnsureAdmin(ctx, cfg.AdminEmail, cfg.AdminPassword); err != nil {
		_ = closeDatabase()
		return nil, nil, fmt.Errorf("seed sql auth admin: %w", err)
	}
	return authStore, closeDatabase, nil
}

func connectConfiguredDatabase(ctx context.Context, cfg config.Config) (*sql.DB, dbadapter.SQLDialect, func() error, error) {
	driverName, dialect, err := dbadapter.DriverForURL(cfg.DatabaseURL)
	if err != nil {
		return nil, "", nil, err
	}
	database, err := dbadapter.Open(driverName, cfg.DatabaseURL)
	if err != nil {
		return nil, "", nil, err
	}
	if err := database.PingContext(ctx); err != nil {
		_ = database.Close()
		return nil, "", nil, fmt.Errorf("ping database: %w", err)
	}
	return database, dialect, database.Close, nil
}

func applyConfiguredMigrations(ctx context.Context, database *sql.DB, migrationsDir string) error {
	migrations, err := dbadapter.LoadMigrations(os.DirFS(migrationsDir), "up")
	if err != nil {
		return fmt.Errorf("load migrations from %s: %w", migrationsDir, err)
	}
	if err := dbadapter.ApplyMigrations(ctx, database, migrations); err != nil {
		return fmt.Errorf("apply migrations: %w", err)
	}
	return nil
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
