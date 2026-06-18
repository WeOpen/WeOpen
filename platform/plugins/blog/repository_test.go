package blog

import (
	"errors"
	"strings"
	"testing"
)

func TestRepositorySupportsDraftCRUD(t *testing.T) {
	t.Parallel()

	repository := NewMemoryRepository()
	post, err := repository.Create(t.Context(), CreatePostInput{
		Title:           "First Post",
		Slug:            "first-post",
		Summary:         "A short summary",
		ContentMarkdown: "# Hello",
		Status:          StatusDraft,
		Terms: []TermInput{
			{Name: "Go", Slug: "go", Type: TermTypeTag},
			{Name: "Engineering", Slug: "engineering", Type: TermTypeCategory},
		},
	})
	if err != nil {
		t.Fatalf("expected draft to be created: %v", err)
	}
	if post.ID == "" {
		t.Fatal("expected generated post id")
	}
	if post.Status != StatusDraft {
		t.Fatalf("expected draft status, got %q", post.Status)
	}
	if len(post.Terms) != 2 {
		t.Fatalf("expected terms to be assigned, got %d", len(post.Terms))
	}

	list, err := repository.List(t.Context(), ListPostsFilter{})
	if err != nil {
		t.Fatalf("expected posts to list: %v", err)
	}
	if len(list) != 1 || list[0].ID != post.ID {
		t.Fatalf("expected created post in list, got %+v", list)
	}

	updated, err := repository.Update(t.Context(), post.ID, UpdatePostInput{
		Title:           "Updated Post",
		Slug:            "updated-post",
		Summary:         "Updated summary",
		ContentMarkdown: "Updated content",
		Status:          StatusDraft,
		Terms:           []TermInput{{Name: "Life", Slug: "life", Type: TermTypeTag}},
	})
	if err != nil {
		t.Fatalf("expected post to update: %v", err)
	}
	if updated.Title != "Updated Post" || updated.Slug != "updated-post" {
		t.Fatalf("expected updated title and slug, got %+v", updated)
	}
	if len(updated.Terms) != 1 || updated.Terms[0].Slug != "life" {
		t.Fatalf("expected updated terms, got %+v", updated.Terms)
	}

	got, err := repository.Get(t.Context(), post.ID)
	if err != nil {
		t.Fatalf("expected post to load: %v", err)
	}
	if got.ContentMarkdown != "Updated content" {
		t.Fatalf("expected updated content, got %q", got.ContentMarkdown)
	}

	if err := repository.Delete(t.Context(), post.ID); err != nil {
		t.Fatalf("expected post to delete: %v", err)
	}
	if _, err := repository.Get(t.Context(), post.ID); !errors.Is(err, ErrPostNotFound) {
		t.Fatalf("expected post not found after delete, got %v", err)
	}
}

func TestRepositoryRejectsDuplicateSlugs(t *testing.T) {
	t.Parallel()

	repository := NewMemoryRepository()
	if _, err := repository.Create(t.Context(), CreatePostInput{Title: "One", Slug: "same", Status: StatusDraft}); err != nil {
		t.Fatalf("expected first post to be created: %v", err)
	}
	if _, err := repository.Create(t.Context(), CreatePostInput{Title: "Two", Slug: "same", Status: StatusDraft}); !errors.Is(err, ErrDuplicateSlug) {
		t.Fatalf("expected duplicate slug error, got %v", err)
	}
}

func TestRepositoryListsPostsWithPaginationMetadataInputs(t *testing.T) {
	t.Parallel()

	repository := NewMemoryRepository()
	for _, title := range []string{"One", "Two", "Three"} {
		if _, err := repository.Create(t.Context(), CreatePostInput{
			Title:  title,
			Slug:   strings.ToLower(title),
			Status: StatusDraft,
		}); err != nil {
			t.Fatalf("expected post %q to be created: %v", title, err)
		}
	}

	list, err := repository.List(t.Context(), ListPostsFilter{Limit: 2, Offset: 1})
	if err != nil {
		t.Fatalf("expected paginated posts to list: %v", err)
	}
	if len(list) != 2 {
		t.Fatalf("expected 2 paginated posts, got %d", len(list))
	}
	total, err := repository.Count(t.Context(), ListPostsFilter{})
	if err != nil {
		t.Fatalf("expected posts to count: %v", err)
	}
	if total != 3 {
		t.Fatalf("expected total 3 posts, got %d", total)
	}
	if _, err := repository.List(t.Context(), ListPostsFilter{Limit: -1}); !errors.Is(err, ErrInvalidPagination) {
		t.Fatalf("expected invalid pagination error, got %v", err)
	}
}

func TestRepositoryPublishesDraftsWithPublishedTimestamp(t *testing.T) {
	t.Parallel()

	repository := NewMemoryRepository()
	post, err := repository.Create(t.Context(), CreatePostInput{Title: "Publish Me", Slug: "publish-me", Status: StatusDraft})
	if err != nil {
		t.Fatalf("expected draft to be created: %v", err)
	}

	published, err := repository.Update(t.Context(), post.ID, UpdatePostInput{
		Title:           post.Title,
		Slug:            post.Slug,
		ContentMarkdown: post.ContentMarkdown,
		Status:          StatusPublished,
	})
	if err != nil {
		t.Fatalf("expected draft to publish: %v", err)
	}
	if published.Status != StatusPublished {
		t.Fatalf("expected published status, got %q", published.Status)
	}
	if published.PublishedAt == nil || published.PublishedAt.IsZero() {
		t.Fatal("expected published timestamp")
	}

	if _, err := repository.Update(t.Context(), post.ID, UpdatePostInput{
		Title:  post.Title,
		Slug:   post.Slug,
		Status: PostStatus("scheduled"),
	}); !errors.Is(err, ErrInvalidStatus) {
		t.Fatalf("expected invalid status error, got %v", err)
	}
}
