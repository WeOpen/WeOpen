// Package secrets owns encrypted provider secret storage and redaction boundaries.
package secrets

import (
	"context"
	"errors"
	"sync"
	"time"
)

// ErrSecretNotFound is returned when a provider secret has not been stored.
var ErrSecretNotFound = errors.New("secret not found")

// Secret stores encrypted secret material and browser-safe metadata.
type Secret struct {
	ID             string    `json:"id"`
	Provider       string    `json:"provider"`
	Name           string    `json:"name"`
	EncryptedValue string    `json:"-"`
	Last4          string    `json:"last4"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

// Store persists encrypted secrets and never receives decrypted values after service encryption.
type Store interface {
	SaveSecret(ctx context.Context, secret Secret) error
	ListSecrets(ctx context.Context) ([]Secret, error)
	Secret(ctx context.Context, provider string, name string) (Secret, error)
}

// Service encrypts writes and redacts list responses for provider secrets.
type Service struct {
	store  Store
	crypto Crypto
	now    func() time.Time
}

// NewService creates a secret service with an injected store and encryption boundary.
func NewService(store Store, crypto Crypto) *Service {
	return &Service{
		store:  store,
		crypto: crypto,
		now:    time.Now,
	}
}

// PutSecret encrypts a provider secret, preserves create time on update, and returns redacted metadata.
func (s *Service) PutSecret(ctx context.Context, provider string, name string, value string) (Secret, error) {
	encrypted, err := s.crypto.Encrypt(value)
	if err != nil {
		return Secret{}, err
	}

	now := s.now()
	secret := Secret{
		ID:             provider + ":" + name,
		Provider:       provider,
		Name:           name,
		EncryptedValue: encrypted,
		Last4:          last4(value),
		CreatedAt:      now,
		UpdatedAt:      now,
	}
	if existing, err := s.store.Secret(ctx, provider, name); err == nil {
		secret.ID = existing.ID
		secret.CreatedAt = existing.CreatedAt
	}

	if err := s.store.SaveSecret(ctx, secret); err != nil {
		return Secret{}, err
	}
	return Redact(secret), nil
}

// List returns redacted secret metadata for frontend settings screens.
func (s *Service) List(ctx context.Context) ([]Secret, error) {
	secrets, err := s.store.ListSecrets(ctx)
	if err != nil {
		return nil, err
	}
	for index := range secrets {
		secrets[index] = Redact(secrets[index])
	}
	return secrets, nil
}

// Reveal decrypts a stored secret for server-side provider calls only.
func (s *Service) Reveal(ctx context.Context, provider string, name string) (string, error) {
	secret, err := s.store.Secret(ctx, provider, name)
	if err != nil {
		return "", err
	}
	return s.crypto.Decrypt(secret.EncryptedValue)
}

// Redact removes encrypted material before a secret crosses an API boundary.
func Redact(secret Secret) Secret {
	secret.EncryptedValue = ""
	return secret
}

// MemoryStore keeps encrypted secrets in process memory for tests and local-only runs.
type MemoryStore struct {
	mu      sync.RWMutex
	secrets map[string]Secret
}

// NewMemoryStore creates an empty in-memory secret store.
func NewMemoryStore() *MemoryStore {
	return &MemoryStore{secrets: map[string]Secret{}}
}

// SaveSecret stores encrypted secret metadata by stable secret ID.
func (m *MemoryStore) SaveSecret(_ context.Context, secret Secret) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.secrets[secret.ID] = secret
	return nil
}

// ListSecrets returns all encrypted secret records for service-level redaction.
func (m *MemoryStore) ListSecrets(_ context.Context) ([]Secret, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	result := make([]Secret, 0, len(m.secrets))
	for _, secret := range m.secrets {
		result = append(result, secret)
	}
	return result, nil
}

// Secret returns one encrypted secret record by provider and logical name.
func (m *MemoryStore) Secret(_ context.Context, provider string, name string) (Secret, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	secret, ok := m.secrets[provider+":"+name]
	if !ok {
		return Secret{}, ErrSecretNotFound
	}
	return secret, nil
}

func last4(value string) string {
	if len(value) <= 4 {
		return value
	}
	return value[len(value)-4:]
}
