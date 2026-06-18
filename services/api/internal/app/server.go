package app

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/WeOpen/WeOpen/platform/plugins/blog"
	domainplugin "github.com/WeOpen/WeOpen/platform/plugins/domains"
	storage "github.com/WeOpen/WeOpen/platform/plugins/storage_r2"
	cloudflareprovider "github.com/WeOpen/WeOpen/platform/providers/cloudflare"
	r2provider "github.com/WeOpen/WeOpen/platform/providers/r2"
	dbadapter "github.com/WeOpen/WeOpen/services/api/internal/adapters/db"
	apihttp "github.com/WeOpen/WeOpen/services/api/internal/adapters/http"
	"github.com/WeOpen/WeOpen/services/api/internal/adapters/secrets"
	"github.com/WeOpen/WeOpen/services/api/internal/config"
	"github.com/WeOpen/WeOpen/services/api/internal/domain/audit"
	"github.com/WeOpen/WeOpen/services/api/internal/domain/auth"
	"github.com/WeOpen/WeOpen/services/api/internal/domain/pluginstate"
)

// databaseConnector opens a configured SQL database and returns its placeholder dialect plus a close hook.
type databaseConnector func(context.Context, config.Config) (*sql.DB, dbadapter.SQLDialect, func() error, error)

// NewHandler wires the API application services and returns an http.Handler shared by local and serverless runtimes.
func NewHandler(cfg config.Config) (http.Handler, error) {
	handler, _, err := newHandlerWithDatabaseConnector(cfg, connectConfiguredDatabase)
	return handler, err
}

// NewHTTPServer wires the API application services and returns the configured HTTP server.
func NewHTTPServer(cfg config.Config) (*http.Server, error) {
	return newHTTPServerWithDatabaseConnector(cfg, connectConfiguredDatabase)
}

func newHTTPServerWithDatabaseConnector(cfg config.Config, connectDatabase databaseConnector) (*http.Server, error) {
	handler, closeDatabase, err := newHandlerWithDatabaseConnector(cfg, connectDatabase)
	if err != nil {
		return nil, err
	}

	server := &http.Server{
		Addr:              cfg.Addr,
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
	}
	if closeDatabase != nil {
		server.RegisterOnShutdown(func() { _ = closeDatabase() })
	}
	return server, nil
}

func newHandlerWithDatabaseConnector(cfg config.Config, connectDatabase databaseConnector) (http.Handler, func() error, error) {
	stores, err := newRuntimeStores(context.Background(), cfg, connectDatabase)
	if err != nil {
		return nil, nil, err
	}
	authService := auth.NewService(stores.authStore)
	secretService := secrets.NewService(stores.secretStore, secrets.NewCrypto(cfg.SecretEncryptionKey))
	auditService := audit.NewServiceWithStore(stores.auditStore)

	r2Client, err := r2provider.NewClient(r2provider.Config{
		AccountID:       cfg.R2AccountID,
		Bucket:          cfg.R2Bucket,
		AccessKeyID:     cfg.R2AccessKeyID,
		SecretAccessKey: cfg.R2SecretAccessKey,
	})
	if err != nil {
		closeDatabaseIfNeeded(stores.close)
		return nil, nil, fmt.Errorf("initialize r2 provider: %w", err)
	}
	storageService := storage.NewService(stores.storageRepository, r2Client, storageAuditRecorder{audit: auditService})
	blogService := blog.NewServiceWithCoverValidator(stores.blogRepository, blogAuditRecorder{audit: auditService}, storageService)
	cloudflareClient, err := cloudflareprovider.NewClientWithTokenSource(cloudflareprovider.Config{}, cloudflareTokenSource{
		secrets:  secretService,
		fallback: cfg.CloudflareAPIToken,
	})
	if err != nil {
		closeDatabaseIfNeeded(stores.close)
		return nil, nil, fmt.Errorf("initialize cloudflare provider: %w", err)
	}
	domainService := domainplugin.NewService(
		stores.domainRepository,
		cloudflareClient,
		domainplugin.NewTLSCertificateChecker(),
		domainsAuditRecorder{audit: auditService},
	)
	pluginRegistry := newBuiltinPluginRegistry(blogService, storageService, domainService)

	handler := apihttp.NewServer(apihttp.ServerOptions{
		WebOrigin:     cfg.WebOrigin,
		Auth:          authService,
		Secrets:       secretService,
		Audit:         auditService,
		Plugins:       pluginRegistry,
		PluginStates:  stores.pluginStates,
		PluginRoutes:  builtinPluginRoutes(blogService, storageService, domainService),
		LoginAttempts: stores.loginAttempts,
		SecureCookies: cfg.IsProductionLike(),
	})
	return handler, stores.close, nil
}

func closeDatabaseIfNeeded(closeDatabase func() error) {
	if closeDatabase != nil {
		_ = closeDatabase()
	}
}

type runtimeStores struct {
	authStore         auth.Store
	auditStore        audit.Store
	secretStore       secrets.Store
	blogRepository    blog.Repository
	storageRepository storage.Repository
	domainRepository  domainplugin.Repository
	pluginStates      pluginstate.Store
	loginAttempts     auth.LoginRateLimitStore
	close             func() error
}

func newRuntimeStores(ctx context.Context, cfg config.Config, connectDatabase databaseConnector) (runtimeStores, error) {
	if strings.TrimSpace(cfg.DatabaseURL) == "" {
		authStore, err := auth.NewMemoryStore(cfg.AdminEmail, cfg.AdminPassword)
		if err != nil {
			return runtimeStores{}, fmt.Errorf("initialize memory auth store: %w", err)
		}
		return runtimeStores{
			authStore:         authStore,
			auditStore:        audit.NewMemoryStore(),
			secretStore:       secrets.NewMemoryStore(),
			blogRepository:    blog.NewMemoryRepository(),
			storageRepository: storage.NewMemoryRepository(),
			domainRepository:  domainplugin.NewMemoryRepository(),
			pluginStates:      pluginstate.NewMemoryStore(),
			loginAttempts:     auth.NewMemoryLoginRateLimitStore(),
		}, nil
	}

	database, dialect, closeDatabase, err := connectDatabase(ctx, cfg)
	if err != nil {
		return runtimeStores{}, fmt.Errorf("connect auth database: %w", err)
	}
	if err := applyConfiguredMigrations(ctx, database, cfg.MigrationsDir); err != nil {
		_ = closeDatabase()
		return runtimeStores{}, err
	}
	authStore := dbadapter.NewSQLAuthStore(database, dbadapter.WithSQLDialect(dialect))
	if err := authStore.EnsureAdmin(ctx, cfg.AdminEmail, cfg.AdminPassword); err != nil {
		_ = closeDatabase()
		return runtimeStores{}, fmt.Errorf("seed sql auth admin: %w", err)
	}
	pluginDialect := pluginstate.SQLDialectSQLite
	if dialect == dbadapter.SQLDialectPostgres {
		pluginDialect = pluginstate.SQLDialectPostgres
	}
	return runtimeStores{
		authStore:         authStore,
		auditStore:        dbadapter.NewSQLAuditStore(database, dbadapter.WithSQLDialect(dialect)),
		secretStore:       dbadapter.NewSQLSecretStore(database, dbadapter.WithSQLSecretDialect(dialect)),
		blogRepository:    dbadapter.NewSQLBlogRepository(database, dbadapter.WithSQLDialect(dialect)),
		storageRepository: dbadapter.NewSQLStorageRepository(database, dbadapter.WithSQLDialect(dialect)),
		domainRepository:  dbadapter.NewSQLDomainRepository(database, dbadapter.WithSQLDialect(dialect)),
		pluginStates:      pluginstate.NewSQLStore(database, pluginstate.WithSQLDialect(pluginDialect)),
		loginAttempts:     dbadapter.NewSQLLoginRateLimitStore(database, dbadapter.WithSQLDialect(dialect)),
		close:             closeDatabase,
	}, nil
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
