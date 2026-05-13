package secrets

import (
	"context"
	"errors"
	"sync"
	"time"
)

var ErrSecretNotFound = errors.New("secret not found")

type Secret struct {
	ID             string    `json:"id"`
	Provider       string    `json:"provider"`
	Name           string    `json:"name"`
	EncryptedValue string    `json:"-"`
	Last4          string    `json:"last4"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

type Store interface {
	SaveSecret(ctx context.Context, secret Secret) error
	ListSecrets(ctx context.Context) ([]Secret, error)
	Secret(ctx context.Context, provider string, name string) (Secret, error)
}

type Service struct {
	store  Store
	crypto Crypto
	now    func() time.Time
}

func NewService(store Store, crypto Crypto) *Service {
	return &Service{
		store:  store,
		crypto: crypto,
		now:    time.Now,
	}
}

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

func (s *Service) Reveal(ctx context.Context, provider string, name string) (string, error) {
	secret, err := s.store.Secret(ctx, provider, name)
	if err != nil {
		return "", err
	}
	return s.crypto.Decrypt(secret.EncryptedValue)
}

func Redact(secret Secret) Secret {
	secret.EncryptedValue = ""
	return secret
}

type MemoryStore struct {
	mu      sync.RWMutex
	secrets map[string]Secret
}

func NewMemoryStore() *MemoryStore {
	return &MemoryStore{secrets: map[string]Secret{}}
}

func (m *MemoryStore) SaveSecret(_ context.Context, secret Secret) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.secrets[secret.ID] = secret
	return nil
}

func (m *MemoryStore) ListSecrets(_ context.Context) ([]Secret, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	result := make([]Secret, 0, len(m.secrets))
	for _, secret := range m.secrets {
		result = append(result, secret)
	}
	return result, nil
}

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
