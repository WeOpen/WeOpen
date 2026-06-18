package blog

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
	ErrPostNotFound        = errors.New("blog post not found")
	ErrDuplicateSlug       = errors.New("blog post slug already exists")
	ErrInvalidStatus       = errors.New("invalid blog post status")
	ErrInvalidPost         = errors.New("invalid blog post")
	ErrInvalidPagination   = errors.New("invalid blog pagination")
	ErrCoverObjectNotFound = errors.New("blog cover object not found")
)

// PostStatus is the lifecycle state of a blog post.
type PostStatus string

const (
	StatusDraft     PostStatus = "draft"
	StatusPublished PostStatus = "published"
	StatusArchived  PostStatus = "archived"
)

// TermType groups taxonomy records into categories and tags.
type TermType string

const (
	TermTypeCategory TermType = "category"
	TermTypeTag      TermType = "tag"
)

// Term is a reusable blog taxonomy record.
type Term struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	Type      TermType  `json:"type"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// Post is the persisted blog article model.
type Post struct {
	ID              string     `json:"id"`
	Title           string     `json:"title"`
	Slug            string     `json:"slug"`
	Summary         string     `json:"summary"`
	ContentMarkdown string     `json:"contentMarkdown"`
	CoverObjectKey  string     `json:"coverObjectKey,omitempty"`
	Status          PostStatus `json:"status"`
	Terms           []Term     `json:"terms"`
	PublishedAt     *time.Time `json:"publishedAt,omitempty"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       time.Time  `json:"updatedAt"`
}

// TermInput is the write shape for assigning categories and tags.
type TermInput struct {
	Name string   `json:"name"`
	Slug string   `json:"slug"`
	Type TermType `json:"type"`
}

// CreatePostInput contains fields needed to create a blog post.
type CreatePostInput struct {
	Title           string      `json:"title"`
	Slug            string      `json:"slug"`
	Summary         string      `json:"summary"`
	ContentMarkdown string      `json:"contentMarkdown"`
	CoverObjectKey  string      `json:"coverObjectKey"`
	Status          PostStatus  `json:"status"`
	Terms           []TermInput `json:"terms"`
}

// UpdatePostInput replaces editable blog post fields.
type UpdatePostInput struct {
	Title           string      `json:"title"`
	Slug            string      `json:"slug"`
	Summary         string      `json:"summary"`
	ContentMarkdown string      `json:"contentMarkdown"`
	CoverObjectKey  string      `json:"coverObjectKey"`
	Status          PostStatus  `json:"status"`
	Terms           []TermInput `json:"terms"`
}

// ListPostsFilter limits repository list results.
type ListPostsFilter struct {
	Status PostStatus
	Limit  int
	Offset int
}

// ListPostsPage is a paginated blog post result.
type ListPostsPage struct {
	Posts   []Post `json:"posts"`
	Total   int    `json:"total"`
	Limit   int    `json:"limit"`
	Offset  int    `json:"offset"`
	HasMore bool   `json:"hasMore"`
}

// Repository defines blog post persistence behavior.
type Repository interface {
	Create(ctx context.Context, input CreatePostInput) (Post, error)
	List(ctx context.Context, filter ListPostsFilter) ([]Post, error)
	Count(ctx context.Context, filter ListPostsFilter) (int, error)
	Get(ctx context.Context, id string) (Post, error)
	Update(ctx context.Context, id string, input UpdatePostInput) (Post, error)
	Delete(ctx context.Context, id string) error
}

// MemoryRepository stores blog posts for local development and tests.
type MemoryRepository struct {
	mu       sync.RWMutex
	now      func() time.Time
	nextID   int
	posts    map[string]Post
	slugToID map[string]string
	terms    map[string]Term
}

// NewMemoryRepository creates an empty blog repository.
func NewMemoryRepository() *MemoryRepository {
	return &MemoryRepository{
		now:      time.Now,
		posts:    map[string]Post{},
		slugToID: map[string]string{},
		terms:    map[string]Term{},
	}
}

// Create persists a new blog post.
func (r *MemoryRepository) Create(_ context.Context, input CreatePostInput) (Post, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	status, err := normalizeStatus(input.Status)
	if err != nil {
		return Post{}, err
	}
	slug, err := normalizeSlug(input.Slug)
	if err != nil {
		return Post{}, err
	}
	if _, exists := r.slugToID[slug]; exists {
		return Post{}, ErrDuplicateSlug
	}
	title := strings.TrimSpace(input.Title)
	if title == "" {
		return Post{}, fmt.Errorf("%w: title is required", ErrInvalidPost)
	}

	now := r.now()
	r.nextID++
	post := Post{
		ID:              fmt.Sprintf("post_%06d", r.nextID),
		Title:           title,
		Slug:            slug,
		Summary:         strings.TrimSpace(input.Summary),
		ContentMarkdown: input.ContentMarkdown,
		CoverObjectKey:  normalizeOptionalKey(input.CoverObjectKey),
		Status:          status,
		Terms:           r.upsertTermsLocked(input.Terms, now),
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if post.Status == StatusPublished {
		post.PublishedAt = timePtr(now)
	}
	r.posts[post.ID] = post
	r.slugToID[post.Slug] = post.ID
	return clonePost(post), nil
}

// List returns posts sorted by creation time descending.
func (r *MemoryRepository) List(_ context.Context, filter ListPostsFilter) ([]Post, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	normalizedFilter, err := normalizeListPostsFilter(filter)
	if err != nil {
		return nil, err
	}
	posts := make([]Post, 0, len(r.posts))
	for _, post := range r.posts {
		if normalizedFilter.Status != "" && post.Status != normalizedFilter.Status {
			continue
		}
		posts = append(posts, clonePost(post))
	}
	sort.Slice(posts, func(i, j int) bool {
		return posts[i].CreatedAt.After(posts[j].CreatedAt)
	})
	return paginatePosts(posts, normalizedFilter), nil
}

// Count returns the number of posts matching the filter, ignoring pagination.
func (r *MemoryRepository) Count(_ context.Context, filter ListPostsFilter) (int, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	if filter.Status != "" {
		if _, err := normalizeStatus(filter.Status); err != nil {
			return 0, err
		}
	}
	total := 0
	for _, post := range r.posts {
		if filter.Status != "" && post.Status != filter.Status {
			continue
		}
		total++
	}
	return total, nil
}

// Get returns one post by ID.
func (r *MemoryRepository) Get(_ context.Context, id string) (Post, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	post, ok := r.posts[id]
	if !ok {
		return Post{}, ErrPostNotFound
	}
	return clonePost(post), nil
}

// Update replaces editable fields on an existing post.
func (r *MemoryRepository) Update(_ context.Context, id string, input UpdatePostInput) (Post, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	post, ok := r.posts[id]
	if !ok {
		return Post{}, ErrPostNotFound
	}
	status, err := normalizeStatus(input.Status)
	if err != nil {
		return Post{}, err
	}
	slug, err := normalizeSlug(input.Slug)
	if err != nil {
		return Post{}, err
	}
	if existingID, exists := r.slugToID[slug]; exists && existingID != id {
		return Post{}, ErrDuplicateSlug
	}
	title := strings.TrimSpace(input.Title)
	if title == "" {
		return Post{}, fmt.Errorf("%w: title is required", ErrInvalidPost)
	}

	now := r.now()
	if post.Slug != slug {
		delete(r.slugToID, post.Slug)
		r.slugToID[slug] = id
	}
	post.Title = title
	post.Slug = slug
	post.Summary = strings.TrimSpace(input.Summary)
	post.ContentMarkdown = input.ContentMarkdown
	post.CoverObjectKey = normalizeOptionalKey(input.CoverObjectKey)
	post.Status = status
	post.Terms = r.upsertTermsLocked(input.Terms, now)
	post.UpdatedAt = now
	if post.Status == StatusPublished && post.PublishedAt == nil {
		post.PublishedAt = timePtr(now)
	}
	r.posts[id] = post
	return clonePost(post), nil
}

// Delete removes a post and its slug reservation.
func (r *MemoryRepository) Delete(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	post, ok := r.posts[id]
	if !ok {
		return ErrPostNotFound
	}
	delete(r.posts, id)
	delete(r.slugToID, post.Slug)
	return nil
}

func (r *MemoryRepository) upsertTermsLocked(inputs []TermInput, now time.Time) []Term {
	terms := make([]Term, 0, len(inputs))
	seen := map[string]struct{}{}
	for _, input := range inputs {
		name := strings.TrimSpace(input.Name)
		slug := strings.ToLower(strings.TrimSpace(input.Slug))
		if name == "" || slug == "" || !validTermType(input.Type) {
			continue
		}
		key := string(input.Type) + ":" + slug
		if _, exists := seen[key]; exists {
			continue
		}
		seen[key] = struct{}{}
		term, exists := r.terms[key]
		if !exists {
			r.nextID++
			term = Term{
				ID:        fmt.Sprintf("term_%06d", r.nextID),
				CreatedAt: now,
			}
		}
		term.Name = name
		term.Slug = slug
		term.Type = input.Type
		term.UpdatedAt = now
		r.terms[key] = term
		terms = append(terms, term)
	}
	return terms
}

func normalizeStatus(status PostStatus) (PostStatus, error) {
	if status == "" {
		return StatusDraft, nil
	}
	switch status {
	case StatusDraft, StatusPublished, StatusArchived:
		return status, nil
	default:
		return "", ErrInvalidStatus
	}
}

func normalizeSlug(slug string) (string, error) {
	slug = strings.ToLower(strings.TrimSpace(slug))
	if slug == "" {
		return "", fmt.Errorf("%w: slug is required", ErrInvalidPost)
	}
	return slug, nil
}

func normalizeOptionalKey(key string) string {
	return strings.TrimLeft(strings.TrimSpace(key), "/")
}

func validTermType(termType TermType) bool {
	return termType == TermTypeCategory || termType == TermTypeTag
}

func normalizeListPostsFilter(filter ListPostsFilter) (ListPostsFilter, error) {
	if filter.Status != "" {
		status, err := normalizeStatus(filter.Status)
		if err != nil {
			return ListPostsFilter{}, err
		}
		filter.Status = status
	}
	if filter.Limit < 0 || filter.Offset < 0 {
		return ListPostsFilter{}, ErrInvalidPagination
	}
	return filter, nil
}

func paginatePosts(posts []Post, filter ListPostsFilter) []Post {
	if filter.Offset >= len(posts) {
		return []Post{}
	}
	start := filter.Offset
	end := len(posts)
	if filter.Limit > 0 && start+filter.Limit < end {
		end = start + filter.Limit
	}
	return posts[start:end]
}

func clonePost(post Post) Post {
	post.Terms = append([]Term(nil), post.Terms...)
	if post.PublishedAt != nil {
		publishedAt := *post.PublishedAt
		post.PublishedAt = &publishedAt
	}
	return post
}

func timePtr(value time.Time) *time.Time {
	return &value
}
