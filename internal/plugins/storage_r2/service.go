package storage_r2

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/WeOpen/WeOpen/internal/providers/r2"
)

// AuditEvent is the storage plugin's audit shape.
type AuditEvent struct {
	ActorUserID string         `json:"actorUserId"`
	PluginID    string         `json:"pluginId"`
	Action      string         `json:"action"`
	TargetType  string         `json:"targetType"`
	TargetID    string         `json:"targetId,omitempty"`
	Metadata    map[string]any `json:"metadata"`
}

// AuditRecorder records storage mutations.
type AuditRecorder interface {
	RecordStorageEvent(ctx context.Context, event AuditEvent) error
}

// Provider is the R2 provider behavior used by the plugin service.
type Provider interface {
	PresignUpload(ctx context.Context, input r2.PresignUploadInput) (r2.PresignedURL, error)
	PresignDownload(ctx context.Context, input r2.PresignDownloadInput) (r2.PresignedURL, error)
}

// Service coordinates storage object indexing and R2 presigned URLs.
type Service struct {
	repository Repository
	provider   Provider
	audit      AuditRecorder
}

// NewService creates a storage service.
func NewService(repository Repository, provider Provider, audit AuditRecorder) *Service {
	return &Service{repository: repository, provider: provider, audit: audit}
}

// CreateUploadInput describes a pending direct upload.
type CreateUploadInput struct {
	Key         string     `json:"key"`
	Filename    string     `json:"filename"`
	ContentType string     `json:"contentType"`
	Size        int64      `json:"size"`
	Visibility  Visibility `json:"visibility"`
}

// CreateUploadResult contains the direct R2 PUT URL.
type CreateUploadResult struct {
	Key       string          `json:"key"`
	UploadURL r2.PresignedURL `json:"uploadUrl"`
}

// CompleteUploadInput indexes a successfully uploaded object.
type CompleteUploadInput struct {
	Key         string     `json:"key"`
	Filename    string     `json:"filename"`
	ContentType string     `json:"contentType"`
	Size        int64      `json:"size"`
	Visibility  Visibility `json:"visibility"`
}

// CreateUploadURL creates a temporary PUT URL.
func (s *Service) CreateUploadURL(ctx context.Context, _ string, input CreateUploadInput) (CreateUploadResult, error) {
	key, err := normalizeKey(input.Key)
	if err != nil {
		return CreateUploadResult{}, err
	}
	visibility, err := normalizeVisibility(input.Visibility)
	if err != nil {
		return CreateUploadResult{}, err
	}
	input.Visibility = visibility
	signed, err := s.provider.PresignUpload(ctx, r2.PresignUploadInput{
		Key:         key,
		ContentType: input.ContentType,
		Expires:     15 * time.Minute,
	})
	if err != nil {
		return CreateUploadResult{}, err
	}
	return CreateUploadResult{Key: key, UploadURL: signed}, nil
}

// CompleteUpload stores an object index after a successful direct upload.
func (s *Service) CompleteUpload(ctx context.Context, actorUserID string, input CompleteUploadInput) (StorageObject, error) {
	key, err := normalizeKey(input.Key)
	if err != nil {
		return StorageObject{}, err
	}
	visibility, err := normalizeVisibility(input.Visibility)
	if err != nil {
		return StorageObject{}, err
	}
	object := StorageObject{
		Key:             key,
		Filename:        firstNonEmpty(input.Filename, key),
		ContentType:     firstNonEmpty(input.ContentType, "application/octet-stream"),
		Size:            input.Size,
		Visibility:      visibility,
		CreatedByUserID: actorUserID,
	}
	return s.repository.Save(ctx, object)
}

// ListObjects returns indexed objects with temporary download URLs.
func (s *Service) ListObjects(ctx context.Context) ([]StorageObject, error) {
	objects, err := s.repository.List(ctx)
	if err != nil {
		return nil, err
	}
	for index := range objects {
		signed, err := s.provider.PresignDownload(ctx, r2.PresignDownloadInput{
			Key:     objects[index].Key,
			Expires: time.Hour,
		})
		if err != nil {
			return nil, err
		}
		objects[index].DownloadURL = signed.URL
	}
	return objects, nil
}

// GetObject returns one indexed object by ID.
func (s *Service) GetObject(ctx context.Context, id string) (StorageObject, error) {
	return s.repository.Get(ctx, id)
}

// ObjectByKey returns one indexed object by R2 key.
func (s *Service) ObjectByKey(ctx context.Context, key string) (StorageObject, error) {
	return s.repository.GetByKey(ctx, key)
}

// ValidateCoverObject verifies that a blog cover object has been indexed.
func (s *Service) ValidateCoverObject(ctx context.Context, key string) error {
	key, err := normalizeKey(key)
	if err != nil {
		return err
	}
	_, err = s.repository.GetByKey(ctx, key)
	return err
}

// SetVisibility changes public/private metadata and records an audit event.
func (s *Service) SetVisibility(ctx context.Context, actorUserID string, id string, visibility Visibility) (StorageObject, error) {
	visibility, err := normalizeVisibility(visibility)
	if err != nil {
		return StorageObject{}, err
	}
	object, err := s.repository.Get(ctx, id)
	if err != nil {
		return StorageObject{}, err
	}
	if object.Visibility == visibility {
		return object, nil
	}
	object.Visibility = visibility
	object, err = s.repository.Save(ctx, object)
	if err != nil {
		return StorageObject{}, err
	}
	if err := s.record(ctx, AuditEvent{
		ActorUserID: actorUserID,
		PluginID:    PluginID,
		Action:      "storage.object.visibility",
		TargetType:  "storage_object",
		TargetID:    object.ID,
		Metadata:    map[string]any{"visibility": visibility},
	}); err != nil {
		return StorageObject{}, err
	}
	return object, nil
}

// DeleteObject removes an indexed object and records an audit event.
func (s *Service) DeleteObject(ctx context.Context, actorUserID string, id string) error {
	object, err := s.repository.Get(ctx, id)
	if err != nil {
		return err
	}
	if err := s.repository.Delete(ctx, id); err != nil {
		return err
	}
	return s.record(ctx, AuditEvent{
		ActorUserID: actorUserID,
		PluginID:    PluginID,
		Action:      "storage.object.delete",
		TargetType:  "storage_object",
		TargetID:    object.ID,
		Metadata:    map[string]any{"key": object.Key},
	})
}

func (s *Service) record(ctx context.Context, event AuditEvent) error {
	if s.audit == nil {
		return nil
	}
	if event.Metadata == nil {
		event.Metadata = map[string]any{}
	}
	return s.audit.RecordStorageEvent(ctx, event)
}

func normalizeKey(key string) (string, error) {
	key = strings.TrimLeft(strings.TrimSpace(key), "/")
	if key == "" || strings.Contains(key, "..") {
		return "", ErrInvalidObject
	}
	return key, nil
}

func normalizeVisibility(visibility Visibility) (Visibility, error) {
	if visibility == "" {
		return VisibilityPrivate, nil
	}
	if !validVisibility(visibility) {
		return "", ErrInvalidVisibility
	}
	return visibility, nil
}

// IsObjectNotFound reports whether an error represents a missing storage object.
func IsObjectNotFound(err error) bool {
	return errors.Is(err, ErrObjectNotFound)
}
