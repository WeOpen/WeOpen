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

func TestNewHTTPServerUsesSQLAuthStoreWhenDatabaseConfigured(t *testing.T) {
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
	var response struct {
		Token string `json:"token"`
	}
	if err := json.Unmarshal(loginRec.Body.Bytes(), &response); err != nil {
		t.Fatalf("expected login json: %v", err)
	}
	if response.Token == "" {
		t.Fatal("expected login token")
	}
	return response.Token
}
