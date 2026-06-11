package db

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"

	"github.com/WeOpen/WeOpen/services/api/internal/domain/audit"
)

// SQLAuditStore persists audit logs in the core audit_logs table.
type SQLAuditStore struct {
	db      *sql.DB
	dialect SQLDialect
}

// NewSQLAuditStore creates a SQL-backed audit store.
func NewSQLAuditStore(database *sql.DB, options ...SQLAuthStoreOption) *SQLAuditStore {
	authStore := NewSQLAuthStore(database, options...)
	return &SQLAuditStore{db: database, dialect: authStore.dialect}
}

// Record stores one audit entry.
func (s *SQLAuditStore) Record(ctx context.Context, entry audit.Entry) (audit.Entry, error) {
	metadata, err := json.Marshal(entry.Metadata)
	if err != nil {
		return audit.Entry{}, fmt.Errorf("marshal audit metadata: %w", err)
	}
	query := `
		INSERT INTO audit_logs (id, actor_user_id, plugin_id, action, target_type, target_id, metadata_json, created_at)
		VALUES (?, nullif(?, ''), nullif(?, ''), ?, ?, nullif(?, ''), ?, ?)
	`
	if _, err := s.db.ExecContext(ctx, rebindSQL(query, s.dialect), entry.ID, entry.ActorUserID, entry.PluginID, entry.Action, entry.TargetType, entry.TargetID, string(metadata), entry.CreatedAt); err != nil {
		return audit.Entry{}, fmt.Errorf("record audit log: %w", err)
	}
	return entry, nil
}

// List returns audit entries newest-first.
func (s *SQLAuditStore) List(ctx context.Context) ([]audit.Entry, error) {
	rows, err := s.db.QueryContext(ctx, `
		SELECT id,
		       COALESCE(actor_user_id, ''),
		       COALESCE(plugin_id, ''),
		       action,
		       target_type,
		       COALESCE(target_id, ''),
		       metadata_json,
		       created_at
		FROM audit_logs
		ORDER BY created_at DESC
		LIMIT 200
	`)
	if err != nil {
		return nil, fmt.Errorf("list audit logs: %w", err)
	}
	defer rows.Close()

	var entries []audit.Entry
	for rows.Next() {
		var entry audit.Entry
		var metadataRaw []byte
		if err := rows.Scan(&entry.ID, &entry.ActorUserID, &entry.PluginID, &entry.Action, &entry.TargetType, &entry.TargetID, &metadataRaw, &entry.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan audit log: %w", err)
		}
		if len(metadataRaw) > 0 {
			if err := json.Unmarshal(metadataRaw, &entry.Metadata); err != nil {
				entry.Metadata = map[string]any{"_decodeError": err.Error()}
			}
		}
		if entry.Metadata == nil {
			entry.Metadata = map[string]any{}
		}
		entries = append(entries, entry)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate audit logs: %w", err)
	}
	return entries, nil
}
