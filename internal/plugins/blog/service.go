package blog

import "context"

// AuditEvent is the blog plugin's audit shape.
type AuditEvent struct {
	ActorUserID string         `json:"actorUserId"`
	PluginID    string         `json:"pluginId"`
	Action      string         `json:"action"`
	TargetType  string         `json:"targetType"`
	TargetID    string         `json:"targetId,omitempty"`
	Metadata    map[string]any `json:"metadata"`
}

// AuditRecorder records blog mutation events without coupling to the API package.
type AuditRecorder interface {
	RecordBlogEvent(ctx context.Context, event AuditEvent) error
}

// CoverObjectValidator verifies storage object keys before a blog post references them.
type CoverObjectValidator interface {
	ValidateCoverObject(ctx context.Context, key string) error
}

// Service coordinates blog repository operations and audit recording.
type Service struct {
	repository Repository
	audit      AuditRecorder
	covers     CoverObjectValidator
}

// NewService creates a blog service.
func NewService(repository Repository, audit AuditRecorder) *Service {
	return &Service{repository: repository, audit: audit}
}

// NewServiceWithCoverValidator creates a blog service that validates cover media.
func NewServiceWithCoverValidator(repository Repository, audit AuditRecorder, covers CoverObjectValidator) *Service {
	return &Service{repository: repository, audit: audit, covers: covers}
}

// CreatePost creates a blog post and records an audit event.
func (s *Service) CreatePost(ctx context.Context, actorUserID string, input CreatePostInput) (Post, error) {
	if err := s.validateCover(ctx, input.CoverObjectKey); err != nil {
		return Post{}, err
	}
	post, err := s.repository.Create(ctx, input)
	if err != nil {
		return Post{}, err
	}
	if err := s.record(ctx, AuditEvent{
		ActorUserID: actorUserID,
		PluginID:    PluginID,
		Action:      "blog.post.create",
		TargetType:  "blog_post",
		TargetID:    post.ID,
		Metadata: map[string]any{
			"slug":   post.Slug,
			"status": post.Status,
		},
	}); err != nil {
		return Post{}, err
	}
	return post, nil
}

// ListPosts returns blog posts.
func (s *Service) ListPosts(ctx context.Context, filter ListPostsFilter) ([]Post, error) {
	return s.repository.List(ctx, filter)
}

// GetPost returns one blog post.
func (s *Service) GetPost(ctx context.Context, id string) (Post, error) {
	return s.repository.Get(ctx, id)
}

// UpdatePost updates a blog post and records an audit event.
func (s *Service) UpdatePost(ctx context.Context, actorUserID string, id string, input UpdatePostInput) (Post, error) {
	if err := s.validateCover(ctx, input.CoverObjectKey); err != nil {
		return Post{}, err
	}
	post, err := s.repository.Update(ctx, id, input)
	if err != nil {
		return Post{}, err
	}
	if err := s.record(ctx, AuditEvent{
		ActorUserID: actorUserID,
		PluginID:    PluginID,
		Action:      "blog.post.update",
		TargetType:  "blog_post",
		TargetID:    post.ID,
		Metadata: map[string]any{
			"slug":   post.Slug,
			"status": post.Status,
		},
	}); err != nil {
		return Post{}, err
	}
	return post, nil
}

// DeletePost deletes a blog post and records an audit event.
func (s *Service) DeletePost(ctx context.Context, actorUserID string, id string) error {
	if err := s.repository.Delete(ctx, id); err != nil {
		return err
	}
	return s.record(ctx, AuditEvent{
		ActorUserID: actorUserID,
		PluginID:    PluginID,
		Action:      "blog.post.delete",
		TargetType:  "blog_post",
		TargetID:    id,
	})
}

func (s *Service) record(ctx context.Context, event AuditEvent) error {
	if s.audit == nil {
		return nil
	}
	if event.Metadata == nil {
		event.Metadata = map[string]any{}
	}
	return s.audit.RecordBlogEvent(ctx, event)
}

func (s *Service) validateCover(ctx context.Context, key string) error {
	key = normalizeOptionalKey(key)
	if key == "" || s.covers == nil {
		return nil
	}
	return s.covers.ValidateCoverObject(ctx, key)
}
