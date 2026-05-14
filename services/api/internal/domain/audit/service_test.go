package audit

import (
	"context"
	"testing"
)

func TestServiceRecordsNewestAuditEntryFirst(t *testing.T) {
	t.Parallel()

	service := NewService()
	if _, err := service.Record(context.Background(), Entry{Action: "first", TargetType: "settings"}); err != nil {
		t.Fatalf("expected first audit entry: %v", err)
	}
	if _, err := service.Record(context.Background(), Entry{Action: "second", TargetType: "settings"}); err != nil {
		t.Fatalf("expected second audit entry: %v", err)
	}

	entries, err := service.List(context.Background())
	if err != nil {
		t.Fatalf("expected audit entries: %v", err)
	}
	if len(entries) != 2 {
		t.Fatalf("expected 2 entries, got %d", len(entries))
	}
	if entries[0].Action != "second" {
		t.Fatalf("expected newest entry first, got %q", entries[0].Action)
	}
}
