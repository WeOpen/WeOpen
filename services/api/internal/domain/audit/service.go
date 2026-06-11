package audit

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"sync"
	"time"
)

// Entry is the append-only security and operations audit record returned to clients.
type Entry struct {
	ID          string         `json:"id"`
	ActorUserID string         `json:"actorUserId"`
	PluginID    string         `json:"pluginId,omitempty"`
	Action      string         `json:"action"`
	TargetType  string         `json:"targetType"`
	TargetID    string         `json:"targetId,omitempty"`
	Metadata    map[string]any `json:"metadata"`
	CreatedAt   time.Time      `json:"createdAt"`
}

// Store persists audit entries. Implementations must return entries newest-first.
type Store interface {
	Record(ctx context.Context, entry Entry) (Entry, error)
	List(ctx context.Context) ([]Entry, error)
}

// Service adds audit defaults and delegates persistence to the configured store.
type Service struct {
	store Store
	now   func() time.Time
}

// NewService creates an audit service with process-memory persistence for local and tests.
func NewService() *Service {
	return NewServiceWithStore(NewMemoryStore())
}

// NewServiceWithStore creates an audit service backed by a durable store.
func NewServiceWithStore(store Store) *Service {
	if store == nil {
		store = NewMemoryStore()
	}
	return &Service{store: store, now: time.Now}
}

// Record appends one audit entry after filling stable defaults.
func (s *Service) Record(ctx context.Context, entry Entry) (Entry, error) {
	if entry.ID == "" {
		entry.ID = "aud_" + randomHex(12)
	}
	if entry.CreatedAt.IsZero() {
		entry.CreatedAt = s.now()
	}
	if entry.Metadata == nil {
		entry.Metadata = map[string]any{}
	}
	return s.store.Record(ctx, entry)
}

// List returns audit entries newest-first.
func (s *Service) List(ctx context.Context) ([]Entry, error) {
	return s.store.List(ctx)
}

// MemoryStore keeps audit entries in process memory.
type MemoryStore struct {
	mu      sync.RWMutex
	entries []Entry
}

// NewMemoryStore creates an empty memory-backed audit store.
func NewMemoryStore() *MemoryStore {
	return &MemoryStore{}
}

// Record stores a newest-first audit entry.
func (s *MemoryStore) Record(_ context.Context, entry Entry) (Entry, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.entries = append([]Entry{entry}, s.entries...)
	return entry, nil
}

// List returns a copy of audit entries newest-first.
func (s *MemoryStore) List(_ context.Context) ([]Entry, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	result := make([]Entry, len(s.entries))
	copy(result, s.entries)
	return result, nil
}

func randomHex(size int) string {
	bytes := make([]byte, size)
	if _, err := rand.Read(bytes); err != nil {
		return time.Now().UTC().Format("20060102150405.000000000")
	}
	return hex.EncodeToString(bytes)
}
