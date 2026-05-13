package secrets

import (
	"context"
	"testing"
)

func TestCryptoEncryptsAndDecrypts(t *testing.T) {
	t.Parallel()

	crypto := NewCrypto("test-key")
	encrypted, err := crypto.Encrypt("secret-value")
	if err != nil {
		t.Fatalf("expected encrypted value: %v", err)
	}
	if encrypted == "secret-value" {
		t.Fatal("expected ciphertext to differ from plaintext")
	}

	decrypted, err := crypto.Decrypt(encrypted)
	if err != nil {
		t.Fatalf("expected decrypted value: %v", err)
	}
	if decrypted != "secret-value" {
		t.Fatalf("expected original plaintext, got %q", decrypted)
	}
}

func TestServiceStoresOnlyRedactedSecretSummaries(t *testing.T) {
	t.Parallel()

	service := NewService(NewMemoryStore(), NewCrypto("test-key"))
	if _, err := service.PutSecret(context.Background(), "cloudflare", "api-token", "super-secret-token"); err != nil {
		t.Fatalf("expected secret to store: %v", err)
	}

	summaries, err := service.List(context.Background())
	if err != nil {
		t.Fatalf("expected secret summaries: %v", err)
	}
	if len(summaries) != 1 {
		t.Fatalf("expected 1 secret summary, got %d", len(summaries))
	}
	if summaries[0].EncryptedValue != "" {
		t.Fatal("expected encrypted value to be redacted")
	}
	if summaries[0].Last4 != "oken" {
		t.Fatalf("expected last4 oken, got %q", summaries[0].Last4)
	}

	revealed, err := service.Reveal(context.Background(), "cloudflare", "api-token")
	if err != nil {
		t.Fatalf("expected revealed secret: %v", err)
	}
	if revealed != "super-secret-token" {
		t.Fatalf("expected original secret, got %q", revealed)
	}
}
