package app

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"io/fs"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"testing"

	"github.com/WeOpen/WeOpen/services/api/internal/adapters/db"
	"github.com/WeOpen/WeOpen/services/api/internal/config"
	_ "modernc.org/sqlite"
)

func TestNewHandlerRespondsToHealthChecks(t *testing.T) {
	t.Parallel()

	handler, err := NewHandler(testConfigWithoutDatabase())
	if err != nil {
		t.Fatalf("expected handler: %v", err)
	}
	req := httptest.NewRequest(http.MethodGet, "/healthz", nil)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected health status %d, got %d body=%s", http.StatusOK, rec.Code, rec.Body.String())
	}
}

func TestNewHandlerServesDevtoolsCatalogRoute(t *testing.T) {
	t.Parallel()

	handler, err := NewHandler(testConfigWithoutDatabase())
	if err != nil {
		t.Fatalf("expected handler: %v", err)
	}
	token := loginAndReturnToken(t, handler)

	req := httptest.NewRequest(http.MethodGet, "/api/plugins/devtools/tools", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	handler.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected devtools catalog status %d, got %d body=%s", http.StatusOK, rec.Code, rec.Body.String())
	}
	var body struct {
		Tools  []map[string]any `json:"tools"`
		Panels []map[string]any `json:"panels"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("expected devtools catalog JSON: %v", err)
	}
	if len(body.Tools) == 0 || len(body.Panels) == 0 {
		t.Fatalf("expected tools and panels from catalog, got %+v", body)
	}
}

func TestNewHTTPServerUsesSQLStoresWhenDatabaseConfigured(t *testing.T) {
	t.Parallel()

	database, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("expected sqlite db: %v", err)
	}
	t.Cleanup(func() { _ = database.Close() })

	cfg := testConfigWithDatabase(t)
	connector := func(context.Context, config.Config) (*sql.DB, db.SQLDialect, func() error, error) {
		return database, db.SQLDialectSQLite, func() error { return nil }, nil
	}

	server, err := newHTTPServerWithDatabaseConnector(cfg, connector)
	if err != nil {
		t.Fatalf("expected SQL-backed server: %v", err)
	}
	token := loginAndReturnToken(t, server.Handler)

	secondServer, err := newHTTPServerWithDatabaseConnector(cfg, connector)
	if err != nil {
		t.Fatalf("expected second SQL-backed server: %v", err)
	}
	meReq := httptest.NewRequest(http.MethodGet, "/api/me", nil)
	meReq.Header.Set("Authorization", "Bearer "+token)
	meRec := httptest.NewRecorder()
	secondServer.Handler.ServeHTTP(meRec, meReq)

	if meRec.Code != http.StatusOK {
		t.Fatalf("expected session to survive server recreation with SQL store, got %d body=%s", meRec.Code, meRec.Body.String())
	}

	patchReq := httptest.NewRequest(http.MethodPatch, "/api/plugins/blog", bytes.NewBufferString(`{"enabled":false}`))
	patchReq.Header.Set("Authorization", "Bearer "+token)
	patchReq.Header.Set("Content-Type", "application/json")
	patchRec := httptest.NewRecorder()
	secondServer.Handler.ServeHTTP(patchRec, patchReq)
	if patchRec.Code != http.StatusOK {
		t.Fatalf("expected SQL-seeded admin permission to manage plugins, got %d body=%s", patchRec.Code, patchRec.Body.String())
	}

	settingsReq := httptest.NewRequest(http.MethodPatch, "/api/settings", bytes.NewBufferString(`{"r2SecretAccessKey":"persisted-secret-value"}`))
	settingsReq.Header.Set("Authorization", "Bearer "+token)
	settingsReq.Header.Set("Content-Type", "application/json")
	settingsRec := httptest.NewRecorder()
	secondServer.Handler.ServeHTTP(settingsRec, settingsReq)
	if settingsRec.Code != http.StatusOK {
		t.Fatalf("expected settings secret save, got %d body=%s", settingsRec.Code, settingsRec.Body.String())
	}

	thirdServer, err := newHTTPServerWithDatabaseConnector(cfg, connector)
	if err != nil {
		t.Fatalf("expected third SQL-backed server: %v", err)
	}
	listReq := httptest.NewRequest(http.MethodGet, "/api/settings", nil)
	listReq.Header.Set("Authorization", "Bearer "+token)
	listRec := httptest.NewRecorder()
	thirdServer.Handler.ServeHTTP(listRec, listReq)
	if listRec.Code != http.StatusOK {
		t.Fatalf("expected settings secret list, got %d body=%s", listRec.Code, listRec.Body.String())
	}
	var settingsBody struct {
		Secrets []struct {
			Provider string `json:"provider"`
			Name     string `json:"name"`
			Last4    string `json:"last4"`
		} `json:"secrets"`
	}
	if err := json.Unmarshal(listRec.Body.Bytes(), &settingsBody); err != nil {
		t.Fatalf("expected settings JSON: %v", err)
	}
	if len(settingsBody.Secrets) != 1 || settingsBody.Secrets[0].Provider != "r2" || settingsBody.Secrets[0].Last4 != "alue" {
		t.Fatalf("expected persisted redacted secret metadata, got %+v", settingsBody.Secrets)
	}
}

func testConfigWithDatabase(t *testing.T) config.Config {
	t.Helper()

	migrationsDir := t.TempDir()
	migration := `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,
  password_changed_at TIMESTAMP,
  mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  mfa_totp_secret TEXT,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  PRIMARY KEY (role_id, permission)
);
CREATE TABLE IF NOT EXISTS user_roles (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id)
);
CREATE TABLE IF NOT EXISTS plugins (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  plugin_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS login_attempts (
  key TEXT PRIMARY KEY,
  failures INTEGER NOT NULL DEFAULT 0,
  first_failure TIMESTAMP NOT NULL,
  locked_until TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS secrets (
  id TEXT PRIMARY KEY,
  provider TEXT NOT NULL,
  name TEXT NOT NULL,
  encrypted_value TEXT NOT NULL,
  last4 TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (provider, name)
);
`
	if err := os.WriteFile(filepath.Join(migrationsDir, "000001_auth.up.sql"), []byte(migration), fs.FileMode(0o644)); err != nil {
		t.Fatalf("expected migration write: %v", err)
	}

	return config.Config{
		Addr:                ":0",
		AppEnv:              "local",
		AppURL:              "http://localhost:8080",
		WebOrigin:           "http://localhost:3000",
		DatabaseURL:         "sqlite://test-auth-store",
		MigrationsDir:       migrationsDir,
		SessionSecret:       "local-session-secret",
		SecretEncryptionKey: "local-secret-key",
		AdminEmail:          "admin@example.com",
		AdminPassword:       "admin",
		R2AccountID:         "local-account",
		R2Bucket:            "weopen-local",
		R2AccessKeyID:       "local-r2-access",
		R2SecretAccessKey:   "local-r2-secret",
	}
}

func testConfigWithoutDatabase() config.Config {
	return config.Config{
		Addr:                ":0",
		AppEnv:              "local",
		AppURL:              "http://localhost:8080",
		WebOrigin:           "http://localhost:3000",
		SessionSecret:       "local-session-secret",
		SecretEncryptionKey: "local-secret-key",
		AdminEmail:          "admin@example.com",
		AdminPassword:       "admin",
		R2AccountID:         "local-account",
		R2Bucket:            "weopen-local",
		R2AccessKeyID:       "local-r2-access",
		R2SecretAccessKey:   "local-r2-secret",
	}
}

func loginAndReturnToken(t *testing.T, handler http.Handler) string {
	t.Helper()

	loginBody := bytes.NewBufferString(`{"email":"admin@example.com","password":"admin"}`)
	loginReq := httptest.NewRequest(http.MethodPost, "/api/auth/login", loginBody)
	loginReq.Header.Set("Content-Type", "application/json")
	loginRec := httptest.NewRecorder()
	handler.ServeHTTP(loginRec, loginReq)
	if loginRec.Code != http.StatusOK {
		t.Fatalf("expected login status %d, got %d body=%s", http.StatusOK, loginRec.Code, loginRec.Body.String())
	}
	for _, cookie := range loginRec.Result().Cookies() {
		if cookie.Name == "weopen_session" {
			if cookie.Value == "" {
				t.Fatal("expected login session cookie value")
			}
			return cookie.Value
		}
	}
	t.Fatalf("expected login session cookie, got %+v", loginRec.Result().Cookies())
	return ""
}
