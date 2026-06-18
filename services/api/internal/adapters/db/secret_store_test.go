package db

import (
	"context"
	"database/sql"
	"testing"
	"time"

	"github.com/WeOpen/WeOpen/services/api/internal/adapters/secrets"
	_ "modernc.org/sqlite"
)

func TestSQLSecretStorePersistsEncryptedSecrets(t *testing.T) {
	t.Parallel()

	database, err := sql.Open("sqlite", ":memory:")
	if err != nil {
		t.Fatalf("expected sqlite database: %v", err)
	}
	t.Cleanup(func() { _ = database.Close() })

	if _, err := database.ExecContext(context.Background(), `
		CREATE TABLE secrets (
			id TEXT PRIMARY KEY,
			provider TEXT NOT NULL,
			name TEXT NOT NULL,
			encrypted_value TEXT NOT NULL,
			last4 TEXT NOT NULL,
			created_at TIMESTAMP NOT NULL,
			updated_at TIMESTAMP NOT NULL,
			UNIQUE (provider, name)
		)
	`); err != nil {
		t.Fatalf("expected secrets schema: %v", err)
	}

	store := NewSQLSecretStore(database)
	createdAt := time.Date(2026, 6, 15, 10, 0, 0, 0, time.UTC)
	updatedAt := time.Date(2026, 6, 15, 11, 0, 0, 0, time.UTC)
	secret := secrets.Secret{
		ID:             "r2:secret-access-key",
		Provider:       "r2",
		Name:           "secret-access-key",
		EncryptedValue: "encrypted-v1",
		Last4:          "1234",
		CreatedAt:      createdAt,
		UpdatedAt:      createdAt,
	}

	if err := store.SaveSecret(context.Background(), secret); err != nil {
		t.Fatalf("expected secret save: %v", err)
	}
	secret.EncryptedValue = "encrypted-v2"
	secret.Last4 = "5678"
	secret.UpdatedAt = updatedAt
	if err := store.SaveSecret(context.Background(), secret); err != nil {
		t.Fatalf("expected secret update: %v", err)
	}

	stored, err := store.Secret(context.Background(), "r2", "secret-access-key")
	if err != nil {
		t.Fatalf("expected stored secret: %v", err)
	}
	if stored.EncryptedValue != "encrypted-v2" || stored.Last4 != "5678" {
		t.Fatalf("expected updated secret, got %+v", stored)
	}

	list, err := store.ListSecrets(context.Background())
	if err != nil {
		t.Fatalf("expected list secrets: %v", err)
	}
	if len(list) != 1 || list[0].Provider != "r2" {
		t.Fatalf("expected one stored secret, got %+v", list)
	}
}
