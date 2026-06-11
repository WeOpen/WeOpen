package auth

import (
	"context"
	"sync"
)

// MemoryLoginRateLimitStore stores rate-limit buckets in process memory.
type MemoryLoginRateLimitStore struct {
	mu       sync.Mutex
	attempts map[string]LoginAttempt
}

// NewMemoryLoginRateLimitStore creates an empty local rate-limit store.
func NewMemoryLoginRateLimitStore() *MemoryLoginRateLimitStore {
	return &MemoryLoginRateLimitStore{attempts: map[string]LoginAttempt{}}
}

// LoginAttempt loads a stored bucket.
func (s *MemoryLoginRateLimitStore) LoginAttempt(_ context.Context, key string) (LoginAttempt, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	attempt, ok := s.attempts[key]
	if !ok {
		return LoginAttempt{}, ErrLoginAttemptNotFound
	}
	return attempt, nil
}

// SaveLoginAttempt stores or replaces one bucket.
func (s *MemoryLoginRateLimitStore) SaveLoginAttempt(_ context.Context, attempt LoginAttempt) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.attempts[attempt.Key] = attempt
	return nil
}

// DeleteLoginAttempt removes one bucket.
func (s *MemoryLoginRateLimitStore) DeleteLoginAttempt(_ context.Context, key string) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	delete(s.attempts, key)
	return nil
}
