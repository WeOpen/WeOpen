package storage_r2

import (
	"context"
	"testing"
	"time"

	"github.com/WeOpen/WeOpen/internal/providers/r2"
)

func TestServiceCreatesUploadURLAndIndexesCompletedObject(t *testing.T) {
	t.Parallel()

	provider := &fakeProvider{}
	audit := &recordingAudit{}
	service := NewService(NewMemoryRepository(), provider, audit)

	upload, err := service.CreateUploadURL(t.Context(), "usr_1", CreateUploadInput{
		Key:         "blog/cover.png",
		Filename:    "cover.png",
		ContentType: "image/png",
		Size:        1200,
		Visibility:  VisibilityPrivate,
	})
	if err != nil {
		t.Fatalf("expected upload URL: %v", err)
	}
	if upload.UploadURL.URL != "https://upload.example/blog/cover.png" {
		t.Fatalf("expected provider upload URL, got %+v", upload.UploadURL)
	}

	object, err := service.CompleteUpload(t.Context(), "usr_1", CompleteUploadInput{
		Key:         upload.Key,
		Filename:    "cover.png",
		ContentType: "image/png",
		Size:        1200,
		Visibility:  VisibilityPrivate,
	})
	if err != nil {
		t.Fatalf("expected completed object: %v", err)
	}
	if object.ID == "" || object.Key != "blog/cover.png" {
		t.Fatalf("expected indexed object, got %+v", object)
	}

	list, err := service.ListObjects(t.Context())
	if err != nil {
		t.Fatalf("expected objects to list: %v", err)
	}
	if len(list) != 1 {
		t.Fatalf("expected 1 object, got %+v", list)
	}
	if list[0].DownloadURL == "" {
		t.Fatalf("expected presigned download URL, got %+v", list[0])
	}
}

func TestServiceRecordsDeleteAndVisibilityAuditEvents(t *testing.T) {
	t.Parallel()

	audit := &recordingAudit{}
	service := NewService(NewMemoryRepository(), &fakeProvider{}, audit)
	object, err := service.CompleteUpload(t.Context(), "usr_1", CompleteUploadInput{
		Key:         "docs/a.txt",
		Filename:    "a.txt",
		ContentType: "text/plain",
		Size:        42,
		Visibility:  VisibilityPrivate,
	})
	if err != nil {
		t.Fatalf("expected object: %v", err)
	}
	if _, err := service.SetVisibility(t.Context(), "usr_1", object.ID, VisibilityPublic); err != nil {
		t.Fatalf("expected visibility update: %v", err)
	}
	if err := service.DeleteObject(t.Context(), "usr_1", object.ID); err != nil {
		t.Fatalf("expected delete: %v", err)
	}

	actions := make([]string, 0, len(audit.events))
	for _, event := range audit.events {
		actions = append(actions, event.Action)
	}
	expected := []string{"storage.object.visibility", "storage.object.delete"}
	if len(actions) != len(expected) {
		t.Fatalf("expected audit actions %+v, got %+v", expected, actions)
	}
	for index, action := range expected {
		if actions[index] != action {
			t.Fatalf("expected action %q at index %d, got %+v", action, index, actions)
		}
	}
}

type fakeProvider struct{}

func (p *fakeProvider) PresignUpload(_ context.Context, input r2.PresignUploadInput) (r2.PresignedURL, error) {
	return r2.PresignedURL{
		Method:  "PUT",
		URL:     "https://upload.example/" + input.Key,
		Headers: map[string]string{"Content-Type": input.ContentType},
		Expires: time.Now().Add(time.Hour),
	}, nil
}

func (p *fakeProvider) PresignDownload(_ context.Context, input r2.PresignDownloadInput) (r2.PresignedURL, error) {
	return r2.PresignedURL{
		Method:  "GET",
		URL:     "https://download.example/" + input.Key,
		Expires: time.Now().Add(time.Hour),
	}, nil
}

type recordingAudit struct {
	events []AuditEvent
}

func (r *recordingAudit) RecordStorageEvent(_ context.Context, event AuditEvent) error {
	r.events = append(r.events, event)
	return nil
}
