package db

import (
	"context"
	"database/sql"
	"strings"
	"testing"
	"time"

	"github.com/WeOpen/WeOpen/platform/plugins/blog"
	"github.com/WeOpen/WeOpen/platform/plugins/domains"
	storage "github.com/WeOpen/WeOpen/platform/plugins/storage_r2"
	_ "modernc.org/sqlite"
)

func TestSQLStorageRepositoryPersistsObjects(t *testing.T) {
	t.Parallel()

	database := newPluginRepositoryTestDB(t)
	repository := NewSQLStorageRepository(database)

	object, err := repository.Save(context.Background(), storage.StorageObject{
		Key:             "uploads/report.pdf",
		Filename:        "report.pdf",
		ContentType:     "application/pdf",
		Size:            123,
		Visibility:      storage.VisibilityPrivate,
		CreatedByUserID: "usr_admin",
	})
	if err != nil {
		t.Fatalf("expected storage save: %v", err)
	}

	secondRepository := NewSQLStorageRepository(database)
	stored, err := secondRepository.GetByKey(context.Background(), "uploads/report.pdf")
	if err != nil {
		t.Fatalf("expected storage object by key: %v", err)
	}
	if stored.ID != object.ID || stored.Filename != "report.pdf" {
		t.Fatalf("expected persisted object, got %+v", stored)
	}
}

func TestSQLBlogRepositoryPersistsPostsAndTerms(t *testing.T) {
	t.Parallel()

	database := newPluginRepositoryTestDB(t)
	repository := NewSQLBlogRepository(database)

	post, err := repository.Create(context.Background(), blog.CreatePostInput{
		Title:           "Hello",
		Slug:            "Hello-World",
		Summary:         "Intro",
		ContentMarkdown: "# Hello",
		Status:          blog.StatusPublished,
		Terms: []blog.TermInput{
			{Name: "Notes", Slug: "notes", Type: blog.TermTypeCategory},
			{Name: "Go", Slug: "go", Type: blog.TermTypeTag},
		},
	})
	if err != nil {
		t.Fatalf("expected blog create: %v", err)
	}
	if post.PublishedAt == nil || len(post.Terms) != 2 {
		t.Fatalf("expected published post with terms, got %+v", post)
	}

	secondRepository := NewSQLBlogRepository(database)
	posts, err := secondRepository.List(context.Background(), blog.ListPostsFilter{Status: blog.StatusPublished})
	if err != nil {
		t.Fatalf("expected blog list: %v", err)
	}
	if len(posts) != 1 || posts[0].Slug != "hello-world" || len(posts[0].Terms) != 2 {
		t.Fatalf("expected persisted blog post, got %+v", posts)
	}
}

func TestSQLBlogRepositoryPaginatesPosts(t *testing.T) {
	t.Parallel()

	database := newPluginRepositoryTestDB(t)
	repository := NewSQLBlogRepository(database)
	for _, slug := range []string{"one", "two", "three"} {
		if _, err := repository.Create(context.Background(), blog.CreatePostInput{
			Title:  slug,
			Slug:   slug,
			Status: blog.StatusPublished,
		}); err != nil {
			t.Fatalf("expected blog create for %q: %v", slug, err)
		}
	}

	posts, err := repository.List(context.Background(), blog.ListPostsFilter{
		Status: blog.StatusPublished,
		Limit:  2,
		Offset: 1,
	})
	if err != nil {
		t.Fatalf("expected paginated blog list: %v", err)
	}
	if len(posts) != 2 {
		t.Fatalf("expected 2 paginated posts, got %+v", posts)
	}
	total, err := repository.Count(context.Background(), blog.ListPostsFilter{Status: blog.StatusPublished})
	if err != nil {
		t.Fatalf("expected blog count: %v", err)
	}
	if total != 3 {
		t.Fatalf("expected total 3 posts, got %d", total)
	}
}

func TestSQLDomainRepositoryPersistsAssetsAndDNSRecords(t *testing.T) {
	t.Parallel()

	database := newPluginRepositoryTestDB(t)
	repository := NewSQLDomainRepository(database)
	expiresAt := time.Date(2026, 7, 1, 0, 0, 0, 0, time.UTC)

	assets, err := repository.UpsertAssets(context.Background(), []domains.DomainAsset{
		{
			Provider:    "cloudflare",
			ProviderID:  "zone_123",
			Name:        "example.com",
			Status:      "active",
			Type:        "full",
			NameServers: []string{"ns1.example.com", "ns2.example.com"},
			Certificate: domains.CertificateStatus{
				Status:    domains.CertificateStatusValid,
				ExpiresAt: expiresAt,
			},
		},
	})
	if err != nil {
		t.Fatalf("expected domain upsert: %v", err)
	}
	if err := repository.ReplaceDNSRecords(context.Background(), assets[0].ID, []domains.DNSRecordSnapshot{
		{ProviderID: "record_1", Type: "A", Name: "example.com", Content: "192.0.2.1", TTL: 1},
	}); err != nil {
		t.Fatalf("expected dns replace: %v", err)
	}

	secondRepository := NewSQLDomainRepository(database)
	storedAssets, err := secondRepository.ListAssets(context.Background())
	if err != nil {
		t.Fatalf("expected domain list: %v", err)
	}
	if len(storedAssets) != 1 || len(storedAssets[0].NameServers) != 2 {
		t.Fatalf("expected persisted domain asset, got %+v", storedAssets)
	}
	records, err := secondRepository.ListDNSRecords(context.Background(), assets[0].ID)
	if err != nil {
		t.Fatalf("expected dns list: %v", err)
	}
	if len(records) != 1 || records[0].ProviderID != "record_1" {
		t.Fatalf("expected persisted dns record, got %+v", records)
	}
}

func newPluginRepositoryTestDB(t *testing.T) *sql.DB {
	t.Helper()

	dsn := "file:" + strings.NewReplacer("/", "_", " ", "_").Replace(t.Name()) + "?mode=memory&cache=shared"
	database, err := sql.Open("sqlite", dsn)
	if err != nil {
		t.Fatalf("expected sqlite database: %v", err)
	}
	t.Cleanup(func() { _ = database.Close() })

	statements := []string{
		`CREATE TABLE storage_objects (id TEXT PRIMARY KEY, key TEXT NOT NULL UNIQUE, filename TEXT NOT NULL, content_type TEXT NOT NULL, size_bytes BIGINT NOT NULL DEFAULT 0, visibility TEXT NOT NULL DEFAULT 'private', created_by_user_id TEXT, created_at TIMESTAMP NOT NULL, updated_at TIMESTAMP NOT NULL)`,
		`CREATE TABLE blog_posts (id TEXT PRIMARY KEY, title TEXT NOT NULL, slug TEXT NOT NULL UNIQUE, summary TEXT NOT NULL DEFAULT '', content_markdown TEXT NOT NULL DEFAULT '', cover_object_key TEXT, status TEXT NOT NULL DEFAULT 'draft', published_at TIMESTAMP, created_at TIMESTAMP NOT NULL, updated_at TIMESTAMP NOT NULL)`,
		`CREATE TABLE blog_terms (id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT NOT NULL, type TEXT NOT NULL, created_at TIMESTAMP NOT NULL, updated_at TIMESTAMP NOT NULL, UNIQUE (slug, type))`,
		`CREATE TABLE blog_post_terms (post_id TEXT NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE, term_id TEXT NOT NULL REFERENCES blog_terms(id) ON DELETE CASCADE, PRIMARY KEY (post_id, term_id))`,
		`CREATE TABLE domain_assets (id TEXT PRIMARY KEY, provider TEXT NOT NULL, provider_id TEXT NOT NULL, name TEXT NOT NULL, status TEXT NOT NULL DEFAULT '', type TEXT NOT NULL DEFAULT '', name_servers_json TEXT NOT NULL DEFAULT '[]', certificate_status TEXT NOT NULL DEFAULT 'unchecked', certificate_expires_at TIMESTAMP, certificate_days_remaining INTEGER, certificate_checked_at TIMESTAMP, certificate_error TEXT NOT NULL DEFAULT '', last_synced_at TIMESTAMP, created_at TIMESTAMP NOT NULL, updated_at TIMESTAMP NOT NULL, UNIQUE (provider, provider_id))`,
		`CREATE TABLE dns_record_snapshots (id TEXT PRIMARY KEY, domain_asset_id TEXT NOT NULL REFERENCES domain_assets(id) ON DELETE CASCADE, provider_id TEXT NOT NULL, type TEXT NOT NULL, name TEXT NOT NULL, content TEXT NOT NULL, ttl INTEGER NOT NULL DEFAULT 1, proxied BOOLEAN NOT NULL DEFAULT FALSE, priority INTEGER, comment TEXT NOT NULL DEFAULT '', synced_at TIMESTAMP NOT NULL, created_at TIMESTAMP, modified_at TIMESTAMP, UNIQUE (domain_asset_id, provider_id))`,
	}
	for _, statement := range statements {
		if _, err := database.ExecContext(context.Background(), statement); err != nil {
			t.Fatalf("expected schema statement %q: %v", statement, err)
		}
	}
	return database
}
