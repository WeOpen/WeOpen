package db

import (
	"context"
	"database/sql"
	"errors"
	"fmt"

	"github.com/WeOpen/WeOpen/services/api/internal/adapters/secrets"
)

// SQLSecretStoreOption customizes SQLSecretStore behavior.
type SQLSecretStoreOption func(*SQLSecretStore)

// WithSQLSecretDialect configures placeholder rendering for SQLSecretStore.
func WithSQLSecretDialect(dialect SQLDialect) SQLSecretStoreOption {
	return func(store *SQLSecretStore) {
		store.dialect = dialect
	}
}

// SQLSecretStore persists encrypted provider secrets in SQL.
type SQLSecretStore struct {
	db      *sql.DB
	dialect SQLDialect
}

// NewSQLSecretStore creates a SQL-backed secrets.Store.
func NewSQLSecretStore(database *sql.DB, options ...SQLSecretStoreOption) *SQLSecretStore {
	store := &SQLSecretStore{db: database, dialect: SQLDialectSQLite}
	for _, option := range options {
		option(store)
	}
	return store
}

// SaveSecret upserts one encrypted secret record.
func (s *SQLSecretStore) SaveSecret(ctx context.Context, secret secrets.Secret) error {
	_, err := s.db.ExecContext(ctx, rebindSQL(`
		INSERT INTO secrets (id, provider, name, encrypted_value, last4, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT (provider, name) DO UPDATE
		SET id = EXCLUDED.id,
		    encrypted_value = EXCLUDED.encrypted_value,
		    last4 = EXCLUDED.last4,
		    created_at = EXCLUDED.created_at,
		    updated_at = EXCLUDED.updated_at
	`, s.dialect), secret.ID, secret.Provider, secret.Name, secret.EncryptedValue, secret.Last4, secret.CreatedAt, secret.UpdatedAt)
	if err != nil {
		return fmt.Errorf("save secret: %w", err)
	}
	return nil
}

// ListSecrets returns every encrypted secret record in stable order.
func (s *SQLSecretStore) ListSecrets(ctx context.Context) ([]secrets.Secret, error) {
	rows, err := s.db.QueryContext(ctx, rebindSQL(`
		SELECT id, provider, name, encrypted_value, last4, created_at, updated_at
		FROM secrets
		ORDER BY provider, name
	`, s.dialect))
	if err != nil {
		return nil, fmt.Errorf("list secrets: %w", err)
	}
	defer rows.Close()

	var result []secrets.Secret
	for rows.Next() {
		var secret secrets.Secret
		if err := rows.Scan(&secret.ID, &secret.Provider, &secret.Name, &secret.EncryptedValue, &secret.Last4, &secret.CreatedAt, &secret.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan secret: %w", err)
		}
		result = append(result, secret)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate secrets: %w", err)
	}
	return result, nil
}

// Secret returns one encrypted secret by provider and logical name.
func (s *SQLSecretStore) Secret(ctx context.Context, provider string, name string) (secrets.Secret, error) {
	row := s.db.QueryRowContext(ctx, rebindSQL(`
		SELECT id, provider, name, encrypted_value, last4, created_at, updated_at
		FROM secrets
		WHERE provider = ? AND name = ?
	`, s.dialect), provider, name)

	var secret secrets.Secret
	if err := row.Scan(&secret.ID, &secret.Provider, &secret.Name, &secret.EncryptedValue, &secret.Last4, &secret.CreatedAt, &secret.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return secrets.Secret{}, secrets.ErrSecretNotFound
		}
		return secrets.Secret{}, fmt.Errorf("load secret: %w", err)
	}
	return secret, nil
}
