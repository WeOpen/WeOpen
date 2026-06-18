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

	"github.com/WeOpen/WeOpen/platform/core/plugin"
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
			INSERT INTO users (id, email, password_hash, display_name, status, must_change_password, password_changed_at, mfa_enabled, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, FALSE, CURRENT_TIMESTAMP, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
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

// ListUsers returns every user with role-derived permissions.
func (s *SQLAuthStore) ListUsers(ctx context.Context) ([]auth.User, error) {
	rows, err := s.query(ctx, s.db, `
		SELECT id
		FROM users
		ORDER BY email
	`)
	if err != nil {
		return nil, fmt.Errorf("list users: %w", err)
	}
	defer rows.Close()

	var users []auth.User
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("scan user id: %w", err)
		}
		user, err := s.UserByID(ctx, id)
		if err != nil {
			return nil, err
		}
		users = append(users, user)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate users: %w", err)
	}
	return users, nil
}

// ListRoles returns every role and its permissions.
func (s *SQLAuthStore) ListRoles(ctx context.Context) ([]auth.Role, error) {
	rows, err := s.query(ctx, s.db, `
		SELECT id, name, description, created_at, updated_at
		FROM roles
		ORDER BY name
	`)
	if err != nil {
		return nil, fmt.Errorf("list roles: %w", err)
	}
	defer rows.Close()

	var roles []auth.Role
	for rows.Next() {
		var role auth.Role
		if err := rows.Scan(&role.ID, &role.Name, &role.Description, &role.CreatedAt, &role.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan role: %w", err)
		}
		permissions, err := s.permissionsForRole(ctx, role.ID)
		if err != nil {
			return nil, err
		}
		role.Permissions = permissions
		roles = append(roles, role)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate roles: %w", err)
	}
	return roles, nil
}

// CreateUser inserts one user and assigns role names atomically.
func (s *SQLAuthStore) CreateUser(ctx context.Context, user auth.User, roleNames []string) (auth.User, error) {
	normalizedEmail := normalizeEmail(user.Email)
	if normalizedEmail == "" || user.PasswordHash == "" {
		return auth.User{}, auth.ErrInvalidCredentials
	}
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return auth.User{}, fmt.Errorf("begin create user transaction: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	roleIDs, err := s.roleIDsByName(ctx, tx, roleNames)
	if err != nil {
		return auth.User{}, err
	}
	userID := user.ID
	if userID == "" {
		userID = deterministicUserID(normalizedEmail)
	}
	displayName := strings.TrimSpace(user.DisplayName)
	if displayName == "" {
		displayName = normalizedEmail
	}
	status := user.Status
	if status == "" {
		status = auth.UserStatusActive
	}
	if _, err := s.exec(ctx, tx, `
		INSERT INTO users (id, email, password_hash, display_name, status, must_change_password, mfa_enabled, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, FALSE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
	`, userID, normalizedEmail, user.PasswordHash, displayName, status, user.MustChangePassword); err != nil {
		return auth.User{}, fmt.Errorf("insert user: %w", err)
	}
	if err := s.replaceUserRoles(ctx, tx, userID, roleIDs); err != nil {
		return auth.User{}, err
	}
	if err := tx.Commit(); err != nil {
		return auth.User{}, fmt.Errorf("commit create user transaction: %w", err)
	}
	return s.UserByID(ctx, userID)
}

// UpdateUser updates mutable user attributes and role assignment.
func (s *SQLAuthStore) UpdateUser(ctx context.Context, userID string, update auth.UserUpdate) (auth.User, error) {
	tx, err := s.db.BeginTx(ctx, nil)
	if err != nil {
		return auth.User{}, fmt.Errorf("begin update user transaction: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	if update.DisplayName != nil {
		result, err := s.exec(ctx, tx, `UPDATE users SET display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, strings.TrimSpace(*update.DisplayName), userID)
		if err != nil {
			return auth.User{}, fmt.Errorf("update user display name: %w", err)
		}
		if changed, _ := result.RowsAffected(); changed == 0 {
			return auth.User{}, auth.ErrUserNotFound
		}
	}
	if update.Status != nil {
		status := strings.TrimSpace(*update.Status)
		if status != auth.UserStatusActive && status != auth.UserStatusDisabled {
			return auth.User{}, auth.ErrInvalidCredentials
		}
		result, err := s.exec(ctx, tx, `UPDATE users SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, status, userID)
		if err != nil {
			return auth.User{}, fmt.Errorf("update user status: %w", err)
		}
		if changed, _ := result.RowsAffected(); changed == 0 {
			return auth.User{}, auth.ErrUserNotFound
		}
		if status == auth.UserStatusDisabled {
			if _, err := s.exec(ctx, tx, `DELETE FROM sessions WHERE user_id = ?`, userID); err != nil {
				return auth.User{}, fmt.Errorf("revoke disabled user sessions: %w", err)
			}
		}
	}
	if update.RoleNames != nil {
		roleIDs, err := s.roleIDsByName(ctx, tx, *update.RoleNames)
		if err != nil {
			return auth.User{}, err
		}
		if err := s.replaceUserRoles(ctx, tx, userID, roleIDs); err != nil {
			return auth.User{}, err
		}
		if _, err := s.exec(ctx, tx, `UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?`, userID); err != nil {
			return auth.User{}, fmt.Errorf("touch user after roles update: %w", err)
		}
	}
	if err := tx.Commit(); err != nil {
		return auth.User{}, fmt.Errorf("commit update user transaction: %w", err)
	}
	return s.UserByID(ctx, userID)
}

// ListSessions returns sessions newest-first, optionally scoped to one user.
func (s *SQLAuthStore) ListSessions(ctx context.Context, userID string) ([]auth.SessionInfo, error) {
	query := `
		SELECT id, user_id, expires_at, created_at
		FROM sessions
	`
	args := []any{}
	if strings.TrimSpace(userID) != "" {
		query += ` WHERE user_id = ?`
		args = append(args, userID)
	}
	query += ` ORDER BY created_at DESC`
	rows, err := s.query(ctx, s.db, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list sessions: %w", err)
	}
	defer rows.Close()

	var sessions []auth.SessionInfo
	for rows.Next() {
		var session auth.SessionInfo
		if err := rows.Scan(&session.ID, &session.UserID, &session.ExpiresAt, &session.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan session: %w", err)
		}
		sessions = append(sessions, session)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate sessions: %w", err)
	}
	return sessions, nil
}

// DeleteSessionByID revokes one session by public ID.
func (s *SQLAuthStore) DeleteSessionByID(ctx context.Context, sessionID string) error {
	if _, err := s.exec(ctx, s.db, `DELETE FROM sessions WHERE id = ?`, sessionID); err != nil {
		return fmt.Errorf("delete session by id: %w", err)
	}
	return nil
}

// DeleteSessionsForUser revokes all sessions for a user except one optional token hash.
func (s *SQLAuthStore) DeleteSessionsForUser(ctx context.Context, userID string, exceptTokenHash string) error {
	if strings.TrimSpace(exceptTokenHash) == "" {
		if _, err := s.exec(ctx, s.db, `DELETE FROM sessions WHERE user_id = ?`, userID); err != nil {
			return fmt.Errorf("delete user sessions: %w", err)
		}
		return nil
	}
	if _, err := s.exec(ctx, s.db, `DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?`, userID, exceptTokenHash); err != nil {
		return fmt.Errorf("delete user sessions except current: %w", err)
	}
	return nil
}

// UpdatePassword stores a new hash and clears the first-change flag.
func (s *SQLAuthStore) UpdatePassword(ctx context.Context, userID string, passwordHash string, changedAt time.Time) error {
	result, err := s.exec(ctx, s.db, `
		UPDATE users
		SET password_hash = ?,
		    must_change_password = FALSE,
		    password_changed_at = ?,
		    updated_at = ?
		WHERE id = ?
	`, passwordHash, changedAt, changedAt, userID)
	if err != nil {
		return fmt.Errorf("update password: %w", err)
	}
	if changed, _ := result.RowsAffected(); changed == 0 {
		return auth.ErrUserNotFound
	}
	return nil
}

// UpdateMFA stores or clears TOTP state.
func (s *SQLAuthStore) UpdateMFA(ctx context.Context, userID string, secret string, enabled bool) error {
	result, err := s.exec(ctx, s.db, `
		UPDATE users
		SET mfa_totp_secret = nullif(?, ''),
		    mfa_enabled = ?,
		    updated_at = CURRENT_TIMESTAMP
		WHERE id = ?
	`, secret, enabled, userID)
	if err != nil {
		return fmt.Errorf("update mfa: %w", err)
	}
	if changed, _ := result.RowsAffected(); changed == 0 {
		return auth.ErrUserNotFound
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
		SELECT id,
		       email,
		       password_hash,
		       display_name,
		       status,
		       must_change_password,
		       password_changed_at,
		       mfa_enabled,
		       COALESCE(mfa_totp_secret, ''),
		       last_login_at,
		       created_at,
		       updated_at
		FROM users
		WHERE %s = ?
	`, column)
	row := s.queryRow(ctx, s.db, query, value)

	var user auth.User
	var lastLoginAt sql.NullTime
	var passwordChangedAt sql.NullTime
	if err := row.Scan(
		&user.ID,
		&user.Email,
		&user.PasswordHash,
		&user.DisplayName,
		&user.Status,
		&user.MustChangePassword,
		&passwordChangedAt,
		&user.MFAEnabled,
		&user.MFASecret,
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
	if passwordChangedAt.Valid {
		user.PasswordChangedAt = &passwordChangedAt.Time
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

func (s *SQLAuthStore) permissionsForRole(ctx context.Context, roleID string) ([]plugin.Permission, error) {
	rows, err := s.query(ctx, s.db, `
		SELECT permission
		FROM role_permissions
		WHERE role_id = ?
		ORDER BY permission
	`, roleID)
	if err != nil {
		return nil, fmt.Errorf("load role permissions: %w", err)
	}
	defer rows.Close()

	var permissions []plugin.Permission
	for rows.Next() {
		var permission plugin.Permission
		if err := rows.Scan(&permission); err != nil {
			return nil, fmt.Errorf("scan role permission: %w", err)
		}
		permissions = append(permissions, permission)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate role permissions: %w", err)
	}
	return permissions, nil
}

func (s *SQLAuthStore) roleIDsByName(ctx context.Context, queryer sqlQueryer, roleNames []string) ([]string, error) {
	roleIDs := make([]string, 0, len(roleNames))
	for _, roleName := range roleNames {
		roleName = strings.ToLower(strings.TrimSpace(roleName))
		if roleName == "" {
			continue
		}
		var id string
		if err := s.queryRow(ctx, queryer, `SELECT id FROM roles WHERE name = ?`, roleName).Scan(&id); err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return nil, auth.ErrRoleNotFound
			}
			return nil, fmt.Errorf("load role %s: %w", roleName, err)
		}
		roleIDs = append(roleIDs, id)
	}
	return roleIDs, nil
}

func (s *SQLAuthStore) replaceUserRoles(ctx context.Context, execer sqlExecer, userID string, roleIDs []string) error {
	if _, err := s.exec(ctx, execer, `DELETE FROM user_roles WHERE user_id = ?`, userID); err != nil {
		return fmt.Errorf("clear user roles: %w", err)
	}
	for _, roleID := range roleIDs {
		if _, err := s.exec(ctx, execer, `
			INSERT INTO user_roles (user_id, role_id, created_at)
			VALUES (?, ?, CURRENT_TIMESTAMP)
			ON CONFLICT (user_id, role_id) DO NOTHING
		`, userID, roleID); err != nil {
			return fmt.Errorf("assign user role: %w", err)
		}
	}
	return nil
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
	return rebindSQL(query, s.dialect)
}

func rebindSQL(query string, dialect SQLDialect) string {
	if dialect != SQLDialectPostgres {
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

func deterministicUserID(email string) string {
	sum := sha256.Sum256([]byte("user:" + email))
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
