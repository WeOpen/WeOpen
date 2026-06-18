package blog

import (
	"context"
	"testing"
)

func TestServiceValidatesCoverObjectKeyBeforeSaving(t *testing.T) {
	t.Parallel()

	validator := &recordingCoverValidator{validKeys: map[string]struct{}{"covers/ok.png": {}}}
	service := NewServiceWithCoverValidator(NewMemoryRepository(), nil, validator)

	if _, err := service.CreatePost(t.Context(), "usr_1", CreatePostInput{
		Title:           "With Cover",
		Slug:            "with-cover",
		ContentMarkdown: "content",
		Status:          StatusDraft,
		CoverObjectKey:  "covers/missing.png",
	}); err == nil {
		t.Fatal("expected invalid cover object error")
	}

	post, err := service.CreatePost(t.Context(), "usr_1", CreatePostInput{
		Title:           "With Cover",
		Slug:            "with-cover",
		ContentMarkdown: "content",
		Status:          StatusDraft,
		CoverObjectKey:  "covers/ok.png",
	})
	if err != nil {
		t.Fatalf("expected post with cover: %v", err)
	}
	if post.CoverObjectKey != "covers/ok.png" {
		t.Fatalf("expected cover key to be saved, got %q", post.CoverObjectKey)
	}
	if validator.checked != "covers/ok.png" {
		t.Fatalf("expected validator to check cover key, got %q", validator.checked)
	}
}

type recordingCoverValidator struct {
	validKeys map[string]struct{}
	checked   string
}

func (v *recordingCoverValidator) ValidateCoverObject(ctx context.Context, key string) error {
	v.checked = key
	if _, ok := v.validKeys[key]; !ok {
		return ErrCoverObjectNotFound
	}
	return nil
}
