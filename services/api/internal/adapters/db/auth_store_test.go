package db

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"github.com/WeOpen/WeOpen/platform/core/plugin"
	"github.com/WeOpen/WeOpen/services/api/internal/domain/auth"
	_ "modernc.org/sqlite"
)

func TestSQLAuthStoreSeedsAdminAndPersistsSession(t *testing.T) {
	t.Parallel()

	database := newAuthStoreTestDB(t)
	store := NewSQLAuthStore(database)

	if err := store.EnsureAdmin(context.Background(), "Admin@Example.com", "admin"); err != nil {
		t.Fatalf("expected admin seed: %v", err)
	}

	user, err := store.UserByEmail(context.Background(), "admin@example.com")
	if err != nil {
		t.Fatalf("expected admin by email: %v", err)
	}
	if user.Email != "admin@example.com" || user.Status != auth.UserStatusActive {
		t.Fatalf("expected active normalized admin, got %+v", user)
	}
	if len(user.Roles) != 1 || user.Roles[0] != "admin" {
		t.Fatalf("expected admin role, got %+v", user.Roles)
	}
	if !hasPermission(user.Permissions, plugin.PermissionPluginManage) {
		t.Fatalf("expected plugin manage permission, got %+v", user.Permissions)
	}
	if !auth.VerifyPassword(user.PasswordHash, "admin") {
		t.Fatal("expected stored admin password hash to verify")
	}

	session := auth.Session{
		ID:        "ses_test",
		UserID:    user.ID,
		TokenHash: "token_hash",
		ExpiresAt: time.Date(2026, 6, 7, 12, 0, 0, 0, time.UTC),
		CreatedAt: time.Date(2026, 6, 7, 11, 0, 0, 0, time.UTC),
	}
	if err := store.SaveSession(context.Background(), session); err != nil {
		t.Fatalf("expected session save: %v", err)
	}
	storedSession, err := store.SessionByTokenHash(context.Background(), session.TokenHash)
	if err != nil {
		t.Fatalf("expected session by token hash: %v", err)
	}
	if storedSession.ID != session.ID || storedSession.UserID != user.ID {
		t.Fatalf("expected stored session, got %+v", storedSession)
	}

	lastLoginAt := time.Date(2026, 6, 7, 13, 0, 0, 0, time.UTC)
	if err := store.TouchLastLogin(context.Background(), user.ID, lastLoginAt); err != nil {
		t.Fatalf("expected touch last login: %v", err)
	}
	updatedUser, err := store.UserByID(context.Background(), user.ID)
	if err != nil {
		t.Fatalf("expected updated user: %v", err)
	}
	if updatedUser.LastLoginAt == nil || !updatedUser.LastLoginAt.Equal(lastLoginAt) {
		t.Fatalf("expected last login %s, got %v", lastLoginAt, updatedUser.LastLoginAt)
	}
}

func TestSQLAuthStorePreservesExistingAdminAndDisabledStatus(t *testing.T) {
	t.Parallel()

	database := newAuthStoreTestDB(t)
	store := NewSQLAuthStore(database)
	passwordHash, err := auth.HashPassword("original")
	if err != nil {
		t.Fatalf("expected hash: %v", err)
	}
	_, err = database.ExecContext(context.Background(), `
		INSERT INTO users (id, email, password_hash, display_name, status, created_at, updated_at)
		VALUES ('usr_existing', 'admin@example.com', ?, 'Owner', 'disabled', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
	`, passwordHash)
	if err != nil {
		t.Fatalf("expected existing user insert: %v", err)
	}

	if err := store.EnsureAdmin(context.Background(), "admin@example.com", "new-password"); err != nil {
		t.Fatalf("expected admin seed to preserve existing user: %v", err)
	}
	user, err := store.UserByEmail(context.Background(), "admin@example.com")
	if err != nil {
		t.Fatalf("expected existing admin: %v", err)
	}
	if user.Status != auth.UserStatusDisabled {
		t.Fatalf("expected disabled status to be preserved, got %q", user.Status)
	}
	if !auth.VerifyPassword(user.PasswordHash, "original") {
		t.Fatal("expected existing password hash to be preserved")
	}
	if len(user.Roles) != 1 || user.Roles[0] != "admin" {
		t.Fatalf("expected admin role assignment, got %+v", user.Roles)
	}
}

func newAuthStoreTestDB(t *testing.T) *sql.DB {
	t.Helper()

	database, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("expected sqlite database: %v", err)
	}
	t.Cleanup(func() { _ = database.Close() })

	statements := []string{
		`CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL, display_name TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', must_change_password BOOLEAN NOT NULL DEFAULT FALSE, password_changed_at TIMESTAMP, mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE, mfa_totp_secret TEXT, last_login_at TIMESTAMP, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
		`CREATE TABLE sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, token_hash TEXT NOT NULL UNIQUE, expires_at TIMESTAMP NOT NULL, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
		`CREATE TABLE roles (id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, description TEXT NOT NULL DEFAULT '', created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
		`CREATE TABLE role_permissions (role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE, permission TEXT NOT NULL, PRIMARY KEY (role_id, permission))`,
		`CREATE TABLE user_roles (user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE, created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP, PRIMARY KEY (user_id, role_id))`,
		`CREATE TABLE login_attempts (key TEXT PRIMARY KEY, failures INTEGER NOT NULL DEFAULT 0, first_failure TIMESTAMP NOT NULL, locked_until TIMESTAMP, updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
	}
	for _, statement := range statements {
		if _, err := database.ExecContext(context.Background(), statement); err != nil {
			t.Fatalf("expected schema statement %q: %v", statement, err)
		}
	}
	return database
}

func hasPermission(permissions []plugin.Permission, expected plugin.Permission) bool {
	for _, permission := range permissions {
		if permission == expected {
			return true
		}
	}
	return false
}

func TestDriverForURLSelectsPostgresDriver(t *testing.T) {
	t.Parallel()

	driver, dialect, err := DriverForURL("postgres://user:pass@example.com/weopen")
	if err != nil {
		t.Fatalf("expected postgres driver: %v", err)
	}
	if driver != "pgx" || dialect != SQLDialectPostgres {
		t.Fatalf("expected pgx/postgres, got %s/%s", driver, dialect)
	}

	if _, _, err := DriverForURL("sqlite://local"); err == nil {
		t.Fatal("expected unsupported sqlite URL for API runtime")
	}
}
