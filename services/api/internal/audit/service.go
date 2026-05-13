package audit

import (
	"context"
	"sync"
	"time"
)

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

type Service struct {
	mu      sync.RWMutex
	entries []Entry
	now     func() time.Time
}

func NewService() *Service {
	return &Service{now: time.Now}
}

func (s *Service) Record(_ context.Context, entry Entry) (Entry, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if entry.ID == "" {
		entry.ID = "aud_" + entry.Action + "_" + entry.TargetType
	}
	if entry.CreatedAt.IsZero() {
		entry.CreatedAt = s.now()
	}
	if entry.Metadata == nil {
		entry.Metadata = map[string]any{}
	}
	s.entries = append([]Entry{entry}, s.entries...)
	return entry, nil
}

func (s *Service) List(_ context.Context) ([]Entry, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	result := make([]Entry, len(s.entries))
	copy(result, s.entries)
	return result, nil
}
