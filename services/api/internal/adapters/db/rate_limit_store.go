package db

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/WeOpen/WeOpen/services/api/internal/domain/auth"
)

// SQLLoginRateLimitStore persists login attempt buckets for shared API instances.
type SQLLoginRateLimitStore struct {
	db      *sql.DB
	dialect SQLDialect
}

// NewSQLLoginRateLimitStore creates a SQL-backed login rate-limit store.
func NewSQLLoginRateLimitStore(database *sql.DB, options ...SQLAuthStoreOption) *SQLLoginRateLimitStore {
	authStore := NewSQLAuthStore(database, options...)
	return &SQLLoginRateLimitStore{db: database, dialect: authStore.dialect}
}

// LoginAttempt loads one bucket.
func (s *SQLLoginRateLimitStore) LoginAttempt(ctx context.Context, key string) (auth.LoginAttempt, error) {
	row := s.db.QueryRowContext(ctx, rebindSQL(`
		SELECT key, failures, first_failure, locked_until, updated_at
		FROM login_attempts
		WHERE key = ?
	`, s.dialect), key)
	var attempt auth.LoginAttempt
	var lockedUntil sql.NullTime
	if err := row.Scan(&attempt.Key, &attempt.Failures, &attempt.FirstFailure, &lockedUntil, &attempt.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return auth.LoginAttempt{}, auth.ErrLoginAttemptNotFound
		}
		return auth.LoginAttempt{}, fmt.Errorf("load login attempt: %w", err)
	}
	if lockedUntil.Valid {
		attempt.LockedUntil = lockedUntil.Time
	}
	return attempt, nil
}

// SaveLoginAttempt stores or updates one bucket.
func (s *SQLLoginRateLimitStore) SaveLoginAttempt(ctx context.Context, attempt auth.LoginAttempt) error {
	_, err := s.db.ExecContext(ctx, rebindSQL(`
		INSERT INTO login_attempts (key, failures, first_failure, locked_until, updated_at)
		VALUES (?, ?, ?, ?, ?)
		ON CONFLICT (key) DO UPDATE
		SET failures = EXCLUDED.failures,
		    first_failure = EXCLUDED.first_failure,
		    locked_until = EXCLUDED.locked_until,
		    updated_at = EXCLUDED.updated_at
	`, s.dialect), attempt.Key, attempt.Failures, attempt.FirstFailure, nullTime(attempt.LockedUntil), attempt.UpdatedAt)
	if err != nil {
		return fmt.Errorf("save login attempt: %w", err)
	}
	return nil
}

func nullTime(value time.Time) any {
	if value.IsZero() {
		return nil
	}
	return value
}

// DeleteLoginAttempt removes one bucket.
func (s *SQLLoginRateLimitStore) DeleteLoginAttempt(ctx context.Context, key string) error {
	if _, err := s.db.ExecContext(ctx, rebindSQL(`DELETE FROM login_attempts WHERE key = ?`, s.dialect), key); err != nil {
		return fmt.Errorf("delete login attempt: %w", err)
	}
	return nil
}
