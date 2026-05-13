package storage_r2

import "testing"

func TestServiceValidatesBlogCoverObjectByKey(t *testing.T) {
	t.Parallel()

	service := NewService(NewMemoryRepository(), &fakeProvider{}, nil)
	if err := service.ValidateCoverObject(t.Context(), "covers/missing.png"); err == nil {
		t.Fatal("expected missing cover object error")
	}
	if _, err := service.CompleteUpload(t.Context(), "usr_1", CompleteUploadInput{
		Key:         "covers/ok.png",
		Filename:    "ok.png",
		ContentType: "image/png",
		Size:        10,
		Visibility:  VisibilityPrivate,
	}); err != nil {
		t.Fatalf("expected cover object: %v", err)
	}
	if err := service.ValidateCoverObject(t.Context(), "covers/ok.png"); err != nil {
		t.Fatalf("expected cover object to validate: %v", err)
	}
}
