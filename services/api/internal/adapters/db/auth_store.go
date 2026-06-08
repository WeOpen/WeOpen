package db

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"errors"
	"fmt"
	"net/url"
	"strings"
	"time"

	"github.com/WeOpen/WeOpen/internal/core/plugin"
	"github.com/WeOpen/WeOpen/services/api/internal/domain/auth"
)

const (
	adminRoleID   = "role_admin"
	adminRoleName = "admin"
)

// SQLDialect selects placeholder rendering for database/sql drivers.
type SQLDialect string

const (
	// SQLDialectSQLite uses '?' placeholders and is primarily used by integration tests.
	SQLDialectSQLite SQLDialect = "sqlite"
	// SQLDialectPostgres uses '$1' placeholders for pgx/libpq-compatible drivers.
	SQLDialectPostgres SQLDialect = "postgres"
)

// SQLAuthStoreOption customizes SQLAuthStore behavior.
type SQLAuthStoreOption func(*SQLAuthStore)

// WithSQLDialect configures the SQL placeholder dialect.
func WithSQLDialect(dialect SQLDialect) SQLAuthStoreOption {
	return func(store *SQLAuthStore) {
		store.dialect = dialect
	}
}

// SQLAuthStore persists auth users, roles, permissions, and hashed sessions in SQL.
type SQLAuthStore struct {
	db      *sql.DB
	dialect SQLDialect
}

// NewSQLAuthStore creates an auth.Store backed by database/sql.
func NewSQLAuthStore(database *sql.DB, options ...SQLAuthStoreOption) *SQLAuthStore {
	store := &SQLAuthStore{db: database, dialect: SQLDialectSQLite}
	for _, option := range options {
		option(store)
	}
	return store
}

// DriverForURL chooses a registered database/sql driver for supported DATABASE_URL values.
func DriverForURL(databaseURL string) (string, SQLDialect, error) {
	parsed, err := url.Parse(strings.TrimSpace(databaseURL))
	if err != nil {
		return "", "", fmt.Errorf("parse database url: %w", err)
	}
	switch parsed.Scheme {
	case "postgres", "postgresql":
		return "pgx", SQLDialectPostgres, nil
	default:
		return "", "", fmt.Errorf("unsupported database url scheme %q", parsed.Scheme)
	}
}

// EnsureAdmin seeds the built-in admin role and links the configured admin user without overwriting existing credentials or status.
func (s *SQLAuthStore) EnsureAdmin(ctx context.Context, email string, password string) error {
	if s == nil || s.db == nil {
		return errors.New("auth sql store database is required")
	}
	normalizedEmail := normalizeEmail(email)
	if normalizedEmail == "" {
		return auth.ErrInvalidCredentials
	}

	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin auth seed transaction: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	if err = s.ensureAdminRole(ctx, tx); err != nil {
		return err
	}

	userID, err := s.userIDByEmail(ctx, tx, normalizedEmail)
	if err != nil {
		return err
	}
	if userID == "" {
		passwordHash, hashErr := auth.HashPassword(password)
		if hashErr != nil {
			return fmt.Errorf("hash admin password: %w", hashErr)
		}
		userID = deterministicAdminUserID(normalizedEmail)
		if _, err = s.exec(ctx, tx, `
			INSERT INTO users (id, email, password_hash, display_name, status, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
		`, userID, normalizedEmail, passwordHash, "Admin", auth.UserStatusActive); err != nil {
			return fmt.Errorf("insert admin user: %w", err)
		}
	}

	if _, err = s.exec(ctx, tx, `
		INSERT INTO user_roles (user_id, role_id, created_at)
		VALUES (?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT (user_id, role_id) DO NOTHING
	`, userID, adminRoleID); err != nil {
		return fmt.Errorf("assign admin role: %w", err)
	}

	if err = tx.Commit(); err != nil {
		return fmt.Errorf("commit auth seed transaction: %w", err)
	}
	return nil
}

// UserByEmail returns a user and its role-derived permissions by normalized email.
func (s *SQLAuthStore) UserByEmail(ctx context.Context, email string) (auth.User, error) {
	return s.userByColumn(ctx, "email", normalizeEmail(email))
}

// UserByID returns a user and its role-derived permissions by ID.
func (s *SQLAuthStore) UserByID(ctx context.Context, id string) (auth.User, error) {
	return s.userByColumn(ctx, "id", id)
}

// SaveSession upserts the hashed auth session.
func (s *SQLAuthStore) SaveSession(ctx context.Context, session auth.Session) error {
	_, err := s.exec(ctx, s.db, `
		INSERT INTO sessions (id, user_id, token_hash, expires_at, created_at)
		VALUES (?, ?, ?, ?, ?)
		ON CONFLICT (token_hash) DO UPDATE
		SET id = EXCLUDED.id,
		    user_id = EXCLUDED.user_id,
		    expires_at = EXCLUDED.expires_at,
		    created_at = EXCLUDED.created_at
	`, session.ID, session.UserID, session.TokenHash, session.ExpiresAt, session.CreatedAt)
	if err != nil {
		return fmt.Errorf("save session: %w", err)
	}
	return nil
}

// DeleteSession removes a session by token hash and is idempotent.
func (s *SQLAuthStore) DeleteSession(ctx context.Context, tokenHash string) error {
	if _, err := s.exec(ctx, s.db, `DELETE FROM sessions WHERE token_hash = ?`, tokenHash); err != nil {
		return fmt.Errorf("delete session: %w", err)
	}
	return nil
}

// SessionByTokenHash loads a hashed auth session.
func (s *SQLAuthStore) SessionByTokenHash(ctx context.Context, tokenHash string) (auth.Session, error) {
	row := s.queryRow(ctx, s.db, `
		SELECT id, user_id, token_hash, expires_at, created_at
		FROM sessions
		WHERE token_hash = ?
	`, tokenHash)

	var session auth.Session
	if err := row.Scan(&session.ID, &session.UserID, &session.TokenHash, &session.ExpiresAt, &session.CreatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return auth.Session{}, auth.ErrSessionNotFound
		}
		return auth.Session{}, fmt.Errorf("load session: %w", err)
	}
	return session, nil
}

// TouchLastLogin records successful login audit data.
func (s *SQLAuthStore) TouchLastLogin(ctx context.Context, userID string, at time.Time) error {
	result, err := s.exec(ctx, s.db, `UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?`, at, at, userID)
	if err != nil {
		return fmt.Errorf("touch last login: %w", err)
	}
	changed, err := result.RowsAffected()
	if err == nil && changed == 0 {
		return auth.ErrInvalidCredentials
	}
	return nil
}

func (s *SQLAuthStore) ensureAdminRole(ctx context.Context, execer sqlExecer) error {
	if _, err := s.exec(ctx, execer, `
		INSERT INTO roles (id, name, description, created_at, updated_at)
		VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
		ON CONFLICT (id) DO UPDATE
		SET name = EXCLUDED.name,
		    description = EXCLUDED.description,
		    updated_at = CURRENT_TIMESTAMP
	`, adminRoleID, adminRoleName, "Built-in administrator with every platform permission"); err != nil {
		return fmt.Errorf("upsert admin role: %w", err)
	}
	for _, permission := range auth.AdminPermissions() {
		if _, err := s.exec(ctx, execer, `
			INSERT INTO role_permissions (role_id, permission)
			VALUES (?, ?)
			ON CONFLICT (role_id, permission) DO NOTHING
		`, adminRoleID, permission); err != nil {
			return fmt.Errorf("upsert admin permission %s: %w", permission, err)
		}
	}
	return nil
}

func (s *SQLAuthStore) userIDByEmail(ctx context.Context, queryer sqlQueryer, email string) (string, error) {
	var id string
	if err := s.queryRow(ctx, queryer, `SELECT id FROM users WHERE email = ?`, email).Scan(&id); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", nil
		}
		return "", fmt.Errorf("load user id by email: %w", err)
	}
	return id, nil
}

func (s *SQLAuthStore) userByColumn(ctx context.Context, column string, value string) (auth.User, error) {
	if strings.TrimSpace(value) == "" {
		return auth.User{}, auth.ErrInvalidCredentials
	}
	if column != "email" && column != "id" {
		return auth.User{}, fmt.Errorf("unsupported user lookup column %q", column)
	}
	query := fmt.Sprintf(`
		SELECT id, email, password_hash, display_name, status, last_login_at, created_at, updated_at
		FROM users
		WHERE %s = ?
	`, column)
	row := s.queryRow(ctx, s.db, query, value)

	var user auth.User
	var lastLoginAt sql.NullTime
	if err := row.Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.DisplayName,
		&user.Status,
		&lastLoginAt,
		&user.CreatedAt,
		&user.UpdatedAt,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return auth.User{}, auth.ErrInvalidCredentials
		}
		return auth.User{}, fmt.Errorf("load user by %s: %w", column, err)
	}
	if lastLoginAt.Valid {
		user.LastLoginAt = &lastLoginAt.Time
	}
	roles, err := s.rolesForUser(ctx, user.ID)
	if err != nil {
		return auth.User{}, err
	}
	permissions, err := s.permissionsForUser(ctx, user.ID)
	if err != nil {
		return auth.User{}, err
	}
	user.Roles = roles
	user.Permissions = permissions
	return user, nil
}

func (s *SQLAuthStore) rolesForUser(ctx context.Context, userID string) ([]string, error) {
	rows, err := s.query(ctx, s.db, `
		SELECT r.name
		FROM roles r
		JOIN user_roles ur ON ur.role_id = r.id
		WHERE ur.user_id = ?
		ORDER BY r.name
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("load user roles: %w", err)
	}
	defer rows.Close()

	var roles []string
	for rows.Next() {
		var role string
		if err := rows.Scan(&role); err != nil {
			return nil, fmt.Errorf("scan user role: %w", err)
		}
		roles = append(roles, role)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate user roles: %w", err)
	}
	return roles, nil
}

func (s *SQLAuthStore) permissionsForUser(ctx context.Context, userID string) ([]plugin.Permission, error) {
	rows, err := s.query(ctx, s.db, `
		SELECT DISTINCT rp.permission
		FROM role_permissions rp
		JOIN user_roles ur ON ur.role_id = rp.role_id
		WHERE ur.user_id = ?
		ORDER BY rp.permission
	`, userID)
	if err != nil {
		return nil, fmt.Errorf("load user permissions: %w", err)
	}
	defer rows.Close()

	var permissions []plugin.Permission
	for rows.Next() {
		var permission plugin.Permission
		if err := rows.Scan(&permission); err != nil {
			return nil, fmt.Errorf("scan user permission: %w", err)
		}
		permissions = append(permissions, permission)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate user permissions: %w", err)
	}
	return permissions, nil
}

func (s *SQLAuthStore) exec(ctx context.Context, execer sqlExecer, query string, args ...any) (sql.Result, error) {
	return execer.ExecContext(ctx, s.rebind(query), args...)
}

func (s *SQLAuthStore) query(ctx context.Context, queryer sqlQueryer, query string, args ...any) (*sql.Rows, error) {
	return queryer.QueryContext(ctx, s.rebind(query), args...)
}

func (s *SQLAuthStore) queryRow(ctx context.Context, queryer sqlQueryer, query string, args ...any) *sql.Row {
	return queryer.QueryRowContext(ctx, s.rebind(query), args...)
}

func (s *SQLAuthStore) rebind(query string) string {
	if s.dialect != SQLDialectPostgres {
		return query
	}
	var builder strings.Builder
	placeholder := 1
	for _, char := range query {
		if char == '?' {
			builder.WriteString("$")
			builder.WriteString(fmt.Sprint(placeholder))
			placeholder++
			continue
		}
		builder.WriteRune(char)
	}
	return builder.String()
}

func deterministicAdminUserID(email string) string {
	sum := sha256.Sum256([]byte(email))
	return "usr_" + hex.EncodeToString(sum[:8])
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

type sqlExecer interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
}

type sqlQueryer interface {
	QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
	QueryRowContext(ctx context.Context, query string, args ...any) *sql.Row
}
