package storage_r2

import (
	"context"
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"
)

var (
	ErrObjectNotFound    = errors.New("storage object not found")
	ErrInvalidObject     = errors.New("invalid storage object")
	ErrInvalidVisibility = errors.New("invalid storage visibility")
)

// Visibility controls how the platform treats indexed objects.
type Visibility string

const (
	VisibilityPrivate Visibility = "private"
	VisibilityPublic  Visibility = "public"
)

// StorageObject is the platform index record for an R2 object.
type StorageObject struct {
	ID              string     `json:"id"`
	Key             string     `json:"key"`
	Filename        string     `json:"filename"`
	ContentType     string     `json:"contentType"`
	Size            int64      `json:"size"`
	Visibility      Visibility `json:"visibility"`
	CreatedByUserID string     `json:"createdByUserId"`
	DownloadURL     string     `json:"downloadUrl,omitempty"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
}

// Repository stores indexed R2 objects.
type Repository interface {
	Save(ctx context.Context, object StorageObject) (StorageObject, error)
	List(ctx context.Context) ([]StorageObject, error)
	Get(ctx context.Context, id string) (StorageObject, error)
	GetByKey(ctx context.Context, key string) (StorageObject, error)
	Delete(ctx context.Context, id string) error
}

// MemoryRepository is a local indexed object store.
type MemoryRepository struct {
	mu      sync.RWMutex
	now     func() time.Time
	nextID  int
	objects map[string]StorageObject
	keyToID map[string]string
}

// NewMemoryRepository creates an empty storage object repository.
func NewMemoryRepository() *MemoryRepository {
	return &MemoryRepository{
		now:     time.Now,
		objects: map[string]StorageObject{},
		keyToID: map[string]string{},
	}
}

// Save creates or replaces an object index by key.
func (r *MemoryRepository) Save(_ context.Context, object StorageObject) (StorageObject, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if strings.TrimSpace(object.Key) == "" {
		return StorageObject{}, fmt.Errorf("%w: key is required", ErrInvalidObject)
	}
	if object.Visibility == "" {
		object.Visibility = VisibilityPrivate
	}
	if !validVisibility(object.Visibility) {
		return StorageObject{}, ErrInvalidVisibility
	}
	now := r.now()
	if existingID, exists := r.keyToID[object.Key]; exists {
		existing := r.objects[existingID]
		object.ID = existing.ID
		object.CreatedAt = existing.CreatedAt
		object.CreatedByUserID = firstNonEmpty(object.CreatedByUserID, existing.CreatedByUserID)
	} else if object.ID == "" {
		r.nextID++
		object.ID = fmt.Sprintf("obj_%06d", r.nextID)
		object.CreatedAt = now
	}
	object.UpdatedAt = now
	r.objects[object.ID] = object
	r.keyToID[object.Key] = object.ID
	return cloneObject(object), nil
}

// List returns objects sorted by creation time descending.
func (r *MemoryRepository) List(_ context.Context) ([]StorageObject, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	objects := make([]StorageObject, 0, len(r.objects))
	for _, object := range r.objects {
		objects = append(objects, cloneObject(object))
	}
	sort.Slice(objects, func(i, j int) bool {
		return objects[i].CreatedAt.After(objects[j].CreatedAt)
	})
	return objects, nil
}

// Get returns one object by ID.
func (r *MemoryRepository) Get(_ context.Context, id string) (StorageObject, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	object, ok := r.objects[id]
	if !ok {
		return StorageObject{}, ErrObjectNotFound
	}
	return cloneObject(object), nil
}

// GetByKey returns one object by R2 key.
func (r *MemoryRepository) GetByKey(_ context.Context, key string) (StorageObject, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	id, ok := r.keyToID[key]
	if !ok {
		return StorageObject{}, ErrObjectNotFound
	}
	return cloneObject(r.objects[id]), nil
}

// Delete removes an indexed object.
func (r *MemoryRepository) Delete(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	object, ok := r.objects[id]
	if !ok {
		return ErrObjectNotFound
	}
	delete(r.objects, id)
	delete(r.keyToID, object.Key)
	return nil
}

func cloneObject(object StorageObject) StorageObject {
	return object
}

func validVisibility(visibility Visibility) bool {
	return visibility == VisibilityPrivate || visibility == VisibilityPublic
}

func firstNonEmpty(value string, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}
