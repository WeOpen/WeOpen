package blog

import (
	"context"
	"testing"
)

func TestServiceRecordsAuditEventsForMutations(t *testing.T) {
	t.Parallel()

	recorder := &recordingAuditRecorder{}
	service := NewService(NewMemoryRepository(), recorder)

	post, err := service.CreatePost(t.Context(), "usr_1", CreatePostInput{
		Title:           "Audit Me",
		Slug:            "audit-me",
		ContentMarkdown: "content",
		Status:          StatusDraft,
	})
	if err != nil {
		t.Fatalf("expected post to be created: %v", err)
	}
	if _, err := service.UpdatePost(t.Context(), "usr_1", post.ID, UpdatePostInput{
		Title:           "Audit Me Updated",
		Slug:            "audit-me",
		ContentMarkdown: "updated",
		Status:          StatusPublished,
	}); err != nil {
		t.Fatalf("expected post to be updated: %v", err)
	}
	if err := service.DeletePost(t.Context(), "usr_1", post.ID); err != nil {
		t.Fatalf("expected post to be deleted: %v", err)
	}

	actions := []string{}
	for _, event := range recorder.events {
		actions = append(actions, event.Action)
		if event.PluginID != PluginID {
			t.Fatalf("expected blog plugin id, got %q", event.PluginID)
		}
		if event.ActorUserID != "usr_1" {
			t.Fatalf("expected actor id on audit event, got %q", event.ActorUserID)
		}
	}
	expected := []string{"blog.post.create", "blog.post.update", "blog.post.delete"}
	if len(actions) != len(expected) {
		t.Fatalf("expected %d audit events, got %+v", len(expected), actions)
	}
	for index, action := range expected {
		if actions[index] != action {
			t.Fatalf("expected audit action %q at index %d, got %+v", action, index, actions)
		}
	}
}

type recordingAuditRecorder struct {
	events []AuditEvent
}

func (r *recordingAuditRecorder) RecordBlogEvent(_ context.Context, event AuditEvent) error {
	r.events = append(r.events, event)
	return nil
}
