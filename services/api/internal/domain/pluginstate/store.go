// Package pluginstate persists plugin enablement state for the API surface.
package pluginstate

import (
	"context"
	"database/sql"
	"fmt"
	"strings"
	"sync"

	"github.com/WeOpen/WeOpen/platform/core/plugin"
)

// Store reads and writes plugin enablement state by plugin manifest.
type Store interface {
	Seed(ctx context.Context, manifests []plugin.Manifest) error
	Enabled(ctx context.Context) (map[string]bool, error)
	SetEnabled(ctx context.Context, manifest plugin.Manifest, enabled bool) error
}

// MemoryStore is a deterministic local store used by tests and local-only runs.
type MemoryStore struct {
	mu      sync.RWMutex
	plugins map[string]bool
}

// NewMemoryStore creates an empty plugin state store.
func NewMemoryStore() *MemoryStore {
	return &MemoryStore{plugins: map[string]bool{}}
}

// Seed inserts missing plugin state rows with enabled=true.
func (s *MemoryStore) Seed(_ context.Context, manifests []plugin.Manifest) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	for _, manifest := range manifests {
		if _, exists := s.plugins[manifest.ID]; !exists {
			s.plugins[manifest.ID] = true
		}
	}
	return nil
}

// Enabled returns the current enabled state for every known plugin.
func (s *MemoryStore) Enabled(_ context.Context) (map[string]bool, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	states := make(map[string]bool, len(s.plugins))
	for id, enabled := range s.plugins {
		states[id] = enabled
	}
	return states, nil
}

// SetEnabled persists the enabled state for one plugin manifest.
func (s *MemoryStore) SetEnabled(_ context.Context, manifest plugin.Manifest, enabled bool) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.plugins[manifest.ID] = enabled
	return nil
}

// SQLStore persists plugin state in the core plugins table.
type SQLStore struct {
	db      SQLDB
	dialect SQLDialect
}

// SQLDialect selects placeholder rendering for the plugin state store.
type SQLDialect string

const (
	SQLDialectSQLite   SQLDialect = "sqlite"
	SQLDialectPostgres SQLDialect = "postgres"
)

// SQLStoreOption customizes SQLStore behavior.
type SQLStoreOption func(*SQLStore)

// WithSQLDialect configures SQL placeholder rendering.
func WithSQLDialect(dialect SQLDialect) SQLStoreOption {
	return func(store *SQLStore) {
		store.dialect = dialect
	}
}

// SQLDB is the database/sql subset needed by SQLStore.
type SQLDB interface {
	ExecContext(ctx context.Context, query string, args ...any) (sql.Result, error)
	QueryContext(ctx context.Context, query string, args ...any) (*sql.Rows, error)
}

// NewSQLStore creates a plugin state store backed by the plugins table.
func NewSQLStore(db SQLDB, options ...SQLStoreOption) *SQLStore {
	store := &SQLStore{db: db, dialect: SQLDialectSQLite}
	for _, option := range options {
		option(store)
	}
	return store
}

// Seed creates missing plugin rows without overriding existing enabled state.
func (s *SQLStore) Seed(ctx context.Context, manifests []plugin.Manifest) error {
	for _, manifest := range manifests {
		if _, err := s.db.ExecContext(ctx, s.rebind(`
INSERT INTO plugins (id, version, enabled)
VALUES (?, ?, TRUE)
ON CONFLICT (id) DO UPDATE SET
  version = EXCLUDED.version,
  updated_at = CURRENT_TIMESTAMP
`), manifest.ID, manifest.Version); err != nil {
			return fmt.Errorf("seed plugin %s: %w", manifest.ID, err)
		}
	}
	return nil
}

// Enabled returns plugin enabled states from the database.
func (s *SQLStore) Enabled(ctx context.Context) (map[string]bool, error) {
	rows, err := s.db.QueryContext(ctx, `SELECT id, enabled FROM plugins`)
	if err != nil {
		return nil, fmt.Errorf("query plugin states: %w", err)
	}
	defer rows.Close()

	states := map[string]bool{}
	for rows.Next() {
		var id string
		var enabled bool
		if err := rows.Scan(&id, &enabled); err != nil {
			return nil, fmt.Errorf("scan plugin state: %w", err)
		}
		states[id] = enabled
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("read plugin states: %w", err)
	}
	return states, nil
}

// SetEnabled upserts one plugin enabled state in the database.
func (s *SQLStore) SetEnabled(ctx context.Context, manifest plugin.Manifest, enabled bool) error {
	if _, err := s.db.ExecContext(ctx, s.rebind(`
INSERT INTO plugins (id, version, enabled)
VALUES (?, ?, ?)
ON CONFLICT (id) DO UPDATE SET
  version = EXCLUDED.version,
  enabled = EXCLUDED.enabled,
  updated_at = CURRENT_TIMESTAMP
`), manifest.ID, manifest.Version, enabled); err != nil {
		return fmt.Errorf("set plugin %s enabled state: %w", manifest.ID, err)
	}
	return nil
}

func (s *SQLStore) rebind(query string) string {
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
