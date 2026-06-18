package db

import (
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/WeOpen/WeOpen/platform/plugins/blog"
	"github.com/WeOpen/WeOpen/platform/plugins/domains"
	storage "github.com/WeOpen/WeOpen/platform/plugins/storage_r2"
)

// SQLStorageRepository persists R2 object indexes in SQL.
type SQLStorageRepository struct {
	db      *sql.DB
	dialect SQLDialect
	now     func() time.Time
}

// NewSQLStorageRepository creates a SQL-backed storage_r2.Repository.
func NewSQLStorageRepository(database *sql.DB, options ...SQLAuthStoreOption) *SQLStorageRepository {
	authStore := NewSQLAuthStore(database, options...)
	return &SQLStorageRepository{db: database, dialect: authStore.dialect, now: time.Now}
}

// Save creates or replaces an object index by key.
func (r *SQLStorageRepository) Save(ctx context.Context, object storage.StorageObject) (storage.StorageObject, error) {
	if strings.TrimSpace(object.Key) == "" {
		return storage.StorageObject{}, fmt.Errorf("%w: key is required", storage.ErrInvalidObject)
	}
	if object.Visibility == "" {
		object.Visibility = storage.VisibilityPrivate
	}
	if object.Visibility != storage.VisibilityPrivate && object.Visibility != storage.VisibilityPublic {
		return storage.StorageObject{}, storage.ErrInvalidVisibility
	}

	now := r.clock()
	existing, err := r.GetByKey(ctx, object.Key)
	if err == nil {
		object.ID = existing.ID
		object.CreatedAt = existing.CreatedAt
		if strings.TrimSpace(object.CreatedByUserID) == "" {
			object.CreatedByUserID = existing.CreatedByUserID
		}
	} else if errors.Is(err, storage.ErrObjectNotFound) {
		if object.ID == "" {
			object.ID = prefixedID("obj")
		}
		if object.CreatedAt.IsZero() {
			object.CreatedAt = now
		}
	} else {
		return storage.StorageObject{}, err
	}
	object.UpdatedAt = now

	_, err = r.db.ExecContext(ctx, rebindSQL(`
		INSERT INTO storage_objects (id, key, filename, content_type, size_bytes, visibility, created_by_user_id, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
		ON CONFLICT (key) DO UPDATE
		SET filename = EXCLUDED.filename,
		    content_type = EXCLUDED.content_type,
		    size_bytes = EXCLUDED.size_bytes,
		    visibility = EXCLUDED.visibility,
		    created_by_user_id = EXCLUDED.created_by_user_id,
		    updated_at = EXCLUDED.updated_at
	`, r.dialect), object.ID, object.Key, object.Filename, object.ContentType, object.Size, object.Visibility, nullString(object.CreatedByUserID), object.CreatedAt, object.UpdatedAt)
	if err != nil {
		return storage.StorageObject{}, fmt.Errorf("save storage object: %w", err)
	}
	return r.Get(ctx, object.ID)
}

// List returns objects sorted by creation time descending.
func (r *SQLStorageRepository) List(ctx context.Context) ([]storage.StorageObject, error) {
	rows, err := r.db.QueryContext(ctx, rebindSQL(`
		SELECT id, key, filename, content_type, size_bytes, visibility, created_by_user_id, created_at, updated_at
		FROM storage_objects
		ORDER BY created_at DESC
	`, r.dialect))
	if err != nil {
		return nil, fmt.Errorf("list storage objects: %w", err)
	}
	defer rows.Close()
	return scanStorageObjects(rows)
}

// Get returns one object by ID.
func (r *SQLStorageRepository) Get(ctx context.Context, id string) (storage.StorageObject, error) {
	return r.storageObjectByColumn(ctx, "id", id)
}

// GetByKey returns one object by R2 key.
func (r *SQLStorageRepository) GetByKey(ctx context.Context, key string) (storage.StorageObject, error) {
	return r.storageObjectByColumn(ctx, "key", key)
}

// Delete removes an indexed object.
func (r *SQLStorageRepository) Delete(ctx context.Context, id string) error {
	result, err := r.db.ExecContext(ctx, rebindSQL(`DELETE FROM storage_objects WHERE id = ?`, r.dialect), id)
	if err != nil {
		return fmt.Errorf("delete storage object: %w", err)
	}
	if affected, err := result.RowsAffected(); err == nil && affected == 0 {
		return storage.ErrObjectNotFound
	}
	return nil
}

func (r *SQLStorageRepository) storageObjectByColumn(ctx context.Context, column string, value string) (storage.StorageObject, error) {
	if column != "id" && column != "key" {
		return storage.StorageObject{}, storage.ErrObjectNotFound
	}
	row := r.db.QueryRowContext(ctx, rebindSQL(fmt.Sprintf(`
		SELECT id, key, filename, content_type, size_bytes, visibility, created_by_user_id, created_at, updated_at
		FROM storage_objects
		WHERE %s = ?
	`, column), r.dialect), value)
	object, err := scanStorageObject(row)
	if err != nil {
		return storage.StorageObject{}, err
	}
	return object, nil
}

func (r *SQLStorageRepository) clock() time.Time {
	if r.now == nil {
		return time.Now()
	}
	return r.now()
}

// SQLBlogRepository persists blog posts and terms in SQL.
type SQLBlogRepository struct {
	db      *sql.DB
	dialect SQLDialect
	now     func() time.Time
}

// NewSQLBlogRepository creates a SQL-backed blog.Repository.
func NewSQLBlogRepository(database *sql.DB, options ...SQLAuthStoreOption) *SQLBlogRepository {
	authStore := NewSQLAuthStore(database, options...)
	return &SQLBlogRepository{db: database, dialect: authStore.dialect, now: time.Now}
}

// Create persists a new blog post.
func (r *SQLBlogRepository) Create(ctx context.Context, input blog.CreatePostInput) (blog.Post, error) {
	status, slug, title, err := normalizeBlogInput(input.Status, input.Slug, input.Title)
	if err != nil {
		return blog.Post{}, err
	}
	now := r.clock()
	post := blog.Post{
		ID:              prefixedID("post"),
		Title:           title,
		Slug:            slug,
		Summary:         strings.TrimSpace(input.Summary),
		ContentMarkdown: input.ContentMarkdown,
		CoverObjectKey:  normalizeOptionalKey(input.CoverObjectKey),
		Status:          status,
		CreatedAt:       now,
		UpdatedAt:       now,
	}
	if status == blog.StatusPublished {
		post.PublishedAt = &now
	}

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return blog.Post{}, fmt.Errorf("begin blog create: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	if exists, err := r.blogSlugExists(ctx, tx, slug, ""); err != nil {
		return blog.Post{}, err
	} else if exists {
		return blog.Post{}, blog.ErrDuplicateSlug
	}
	if _, err := tx.ExecContext(ctx, rebindSQL(`
		INSERT INTO blog_posts (id, title, slug, summary, content_markdown, cover_object_key, status, published_at, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`, r.dialect), post.ID, post.Title, post.Slug, post.Summary, post.ContentMarkdown, nullString(post.CoverObjectKey), post.Status, nullTimePtr(post.PublishedAt), post.CreatedAt, post.UpdatedAt); err != nil {
		return blog.Post{}, fmt.Errorf("insert blog post: %w", err)
	}
	terms, err := r.replacePostTerms(ctx, tx, post.ID, input.Terms, now)
	if err != nil {
		return blog.Post{}, err
	}
	if err := tx.Commit(); err != nil {
		return blog.Post{}, fmt.Errorf("commit blog create: %w", err)
	}
	post.Terms = terms
	return post, nil
}

// List returns posts sorted by creation time descending.
func (r *SQLBlogRepository) List(ctx context.Context, filter blog.ListPostsFilter) ([]blog.Post, error) {
	normalizedFilter, err := normalizeSQLBlogListFilter(filter)
	if err != nil {
		return nil, err
	}
	query := `
		SELECT id
		FROM blog_posts
	`
	args := []any{}
	if normalizedFilter.Status != "" {
		query += ` WHERE status = ?`
		args = append(args, normalizedFilter.Status)
	}
	query += ` ORDER BY created_at DESC`
	if normalizedFilter.Limit > 0 {
		query += ` LIMIT ? OFFSET ?`
		args = append(args, normalizedFilter.Limit, normalizedFilter.Offset)
	} else if normalizedFilter.Offset > 0 {
		query += ` LIMIT -1 OFFSET ?`
		args = append(args, normalizedFilter.Offset)
	}

	rows, err := r.db.QueryContext(ctx, rebindSQL(query, r.dialect), args...)
	if err != nil {
		return nil, fmt.Errorf("list blog posts: %w", err)
	}
	defer rows.Close()

	var posts []blog.Post
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			return nil, fmt.Errorf("scan blog post id: %w", err)
		}
		post, err := r.Get(ctx, id)
		if err != nil {
			return nil, err
		}
		posts = append(posts, post)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate blog posts: %w", err)
	}
	return posts, nil
}

// Count returns the number of posts matching the filter, ignoring pagination.
func (r *SQLBlogRepository) Count(ctx context.Context, filter blog.ListPostsFilter) (int, error) {
	if filter.Status != "" {
		if _, err := normalizeBlogStatus(filter.Status); err != nil {
			return 0, err
		}
	}
	query := `SELECT COUNT(*) FROM blog_posts`
	args := []any{}
	if filter.Status != "" {
		query += ` WHERE status = ?`
		args = append(args, filter.Status)
	}
	var total int
	if err := r.db.QueryRowContext(ctx, rebindSQL(query, r.dialect), args...).Scan(&total); err != nil {
		return 0, fmt.Errorf("count blog posts: %w", err)
	}
	return total, nil
}

// Get returns one post by ID.
func (r *SQLBlogRepository) Get(ctx context.Context, id string) (blog.Post, error) {
	post, err := r.blogPostByID(ctx, r.db, id)
	if err != nil {
		return blog.Post{}, err
	}
	terms, err := r.termsForPost(ctx, r.db, id)
	if err != nil {
		return blog.Post{}, err
	}
	post.Terms = terms
	return post, nil
}

// Update replaces editable fields on an existing post.
func (r *SQLBlogRepository) Update(ctx context.Context, id string, input blog.UpdatePostInput) (blog.Post, error) {
	status, slug, title, err := normalizeBlogInput(input.Status, input.Slug, input.Title)
	if err != nil {
		return blog.Post{}, err
	}
	now := r.clock()

	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return blog.Post{}, fmt.Errorf("begin blog update: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	existing, err := r.blogPostByID(ctx, tx, id)
	if err != nil {
		return blog.Post{}, err
	}
	if exists, err := r.blogSlugExists(ctx, tx, slug, id); err != nil {
		return blog.Post{}, err
	} else if exists {
		return blog.Post{}, blog.ErrDuplicateSlug
	}
	publishedAt := existing.PublishedAt
	if status == blog.StatusPublished && publishedAt == nil {
		publishedAt = &now
	}
	if _, err := tx.ExecContext(ctx, rebindSQL(`
		UPDATE blog_posts
		SET title = ?,
		    slug = ?,
		    summary = ?,
		    content_markdown = ?,
		    cover_object_key = ?,
		    status = ?,
		    published_at = ?,
		    updated_at = ?
		WHERE id = ?
	`, r.dialect), title, slug, strings.TrimSpace(input.Summary), input.ContentMarkdown, nullString(normalizeOptionalKey(input.CoverObjectKey)), status, nullTimePtr(publishedAt), now, id); err != nil {
		return blog.Post{}, fmt.Errorf("update blog post: %w", err)
	}
	terms, err := r.replacePostTerms(ctx, tx, id, input.Terms, now)
	if err != nil {
		return blog.Post{}, err
	}
	if err := tx.Commit(); err != nil {
		return blog.Post{}, fmt.Errorf("commit blog update: %w", err)
	}

	post := blog.Post{
		ID:              id,
		Title:           title,
		Slug:            slug,
		Summary:         strings.TrimSpace(input.Summary),
		ContentMarkdown: input.ContentMarkdown,
		CoverObjectKey:  normalizeOptionalKey(input.CoverObjectKey),
		Status:          status,
		Terms:           terms,
		PublishedAt:     publishedAt,
		CreatedAt:       existing.CreatedAt,
		UpdatedAt:       now,
	}
	return post, nil
}

// Delete removes a post.
func (r *SQLBlogRepository) Delete(ctx context.Context, id string) error {
	result, err := r.db.ExecContext(ctx, rebindSQL(`DELETE FROM blog_posts WHERE id = ?`, r.dialect), id)
	if err != nil {
		return fmt.Errorf("delete blog post: %w", err)
	}
	if affected, err := result.RowsAffected(); err == nil && affected == 0 {
		return blog.ErrPostNotFound
	}
	return nil
}

func (r *SQLBlogRepository) blogPostByID(ctx context.Context, queryer sqlQueryer, id string) (blog.Post, error) {
	row := queryer.QueryRowContext(ctx, rebindSQL(`
		SELECT id, title, slug, summary, content_markdown, cover_object_key, status, published_at, created_at, updated_at
		FROM blog_posts
		WHERE id = ?
	`, r.dialect), id)
	var post blog.Post
	var cover sql.NullString
	var publishedAt sql.NullTime
	if err := row.Scan(&post.ID, &post.Title, &post.Slug, &post.Summary, &post.ContentMarkdown, &cover, &post.Status, &publishedAt, &post.CreatedAt, &post.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return blog.Post{}, blog.ErrPostNotFound
		}
		return blog.Post{}, fmt.Errorf("load blog post: %w", err)
	}
	post.CoverObjectKey = cover.String
	if publishedAt.Valid {
		post.PublishedAt = &publishedAt.Time
	}
	return post, nil
}

func (r *SQLBlogRepository) blogSlugExists(ctx context.Context, queryer sqlQueryer, slug string, exceptID string) (bool, error) {
	query := `SELECT id FROM blog_posts WHERE slug = ?`
	args := []any{slug}
	if exceptID != "" {
		query += ` AND id <> ?`
		args = append(args, exceptID)
	}
	var id string
	err := queryer.QueryRowContext(ctx, rebindSQL(query, r.dialect), args...).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return false, nil
	}
	if err != nil {
		return false, fmt.Errorf("check blog slug: %w", err)
	}
	return true, nil
}

func (r *SQLBlogRepository) replacePostTerms(ctx context.Context, tx *sql.Tx, postID string, inputs []blog.TermInput, now time.Time) ([]blog.Term, error) {
	if _, err := tx.ExecContext(ctx, rebindSQL(`DELETE FROM blog_post_terms WHERE post_id = ?`, r.dialect), postID); err != nil {
		return nil, fmt.Errorf("clear blog post terms: %w", err)
	}
	terms := make([]blog.Term, 0, len(inputs))
	seen := map[string]struct{}{}
	for _, input := range inputs {
		name := strings.TrimSpace(input.Name)
		slug := strings.ToLower(strings.TrimSpace(input.Slug))
		if name == "" || slug == "" || !validBlogTermType(input.Type) {
			continue
		}
		key := string(input.Type) + ":" + slug
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}

		term, err := r.upsertTerm(ctx, tx, blog.Term{
			Name:      name,
			Slug:      slug,
			Type:      input.Type,
			UpdatedAt: now,
		}, now)
		if err != nil {
			return nil, err
		}
		if _, err := tx.ExecContext(ctx, rebindSQL(`
			INSERT INTO blog_post_terms (post_id, term_id)
			VALUES (?, ?)
			ON CONFLICT (post_id, term_id) DO NOTHING
		`, r.dialect), postID, term.ID); err != nil {
			return nil, fmt.Errorf("assign blog term: %w", err)
		}
		terms = append(terms, term)
	}
	return terms, nil
}

func (r *SQLBlogRepository) upsertTerm(ctx context.Context, tx *sql.Tx, term blog.Term, now time.Time) (blog.Term, error) {
	row := tx.QueryRowContext(ctx, rebindSQL(`
		SELECT id, created_at
		FROM blog_terms
		WHERE slug = ? AND type = ?
	`, r.dialect), term.Slug, term.Type)
	var id string
	var createdAt time.Time
	if err := row.Scan(&id, &createdAt); err != nil {
		if !errors.Is(err, sql.ErrNoRows) {
			return blog.Term{}, fmt.Errorf("load blog term: %w", err)
		}
		id = prefixedID("term")
		createdAt = now
		if _, err := tx.ExecContext(ctx, rebindSQL(`
			INSERT INTO blog_terms (id, name, slug, type, created_at, updated_at)
			VALUES (?, ?, ?, ?, ?, ?)
		`, r.dialect), id, term.Name, term.Slug, term.Type, createdAt, now); err != nil {
			return blog.Term{}, fmt.Errorf("insert blog term: %w", err)
		}
		return blog.Term{ID: id, Name: term.Name, Slug: term.Slug, Type: term.Type, CreatedAt: createdAt, UpdatedAt: now}, nil
	}
	if _, err := tx.ExecContext(ctx, rebindSQL(`
		UPDATE blog_terms
		SET name = ?, updated_at = ?
		WHERE id = ?
	`, r.dialect), term.Name, now, id); err != nil {
		return blog.Term{}, fmt.Errorf("update blog term: %w", err)
	}
	return blog.Term{ID: id, Name: term.Name, Slug: term.Slug, Type: term.Type, CreatedAt: createdAt, UpdatedAt: now}, nil
}

func (r *SQLBlogRepository) termsForPost(ctx context.Context, queryer sqlQueryer, postID string) ([]blog.Term, error) {
	rows, err := queryer.QueryContext(ctx, rebindSQL(`
		SELECT t.id, t.name, t.slug, t.type, t.created_at, t.updated_at
		FROM blog_terms t
		INNER JOIN blog_post_terms pt ON pt.term_id = t.id
		WHERE pt.post_id = ?
		ORDER BY t.type, t.name
	`, r.dialect), postID)
	if err != nil {
		return nil, fmt.Errorf("list blog terms: %w", err)
	}
	defer rows.Close()

	var terms []blog.Term
	for rows.Next() {
		var term blog.Term
		if err := rows.Scan(&term.ID, &term.Name, &term.Slug, &term.Type, &term.CreatedAt, &term.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan blog term: %w", err)
		}
		terms = append(terms, term)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate blog terms: %w", err)
	}
	return terms, nil
}

func (r *SQLBlogRepository) clock() time.Time {
	if r.now == nil {
		return time.Now()
	}
	return r.now()
}

// SQLDomainRepository persists domain inventory and DNS snapshots in SQL.
type SQLDomainRepository struct {
	db      *sql.DB
	dialect SQLDialect
	now     func() time.Time
}

// NewSQLDomainRepository creates a SQL-backed domains.Repository.
func NewSQLDomainRepository(database *sql.DB, options ...SQLAuthStoreOption) *SQLDomainRepository {
	authStore := NewSQLAuthStore(database, options...)
	return &SQLDomainRepository{db: database, dialect: authStore.dialect, now: time.Now}
}

// UpsertAssets creates or updates domain inventory by provider identity.
func (r *SQLDomainRepository) UpsertAssets(ctx context.Context, assets []domains.DomainAsset) ([]domains.DomainAsset, error) {
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, fmt.Errorf("begin domain upsert: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	now := r.clock()
	result := make([]domains.DomainAsset, 0, len(assets))
	for _, asset := range assets {
		asset.Provider = strings.TrimSpace(asset.Provider)
		asset.ProviderID = strings.TrimSpace(asset.ProviderID)
		asset.Name = strings.TrimSpace(asset.Name)
		if asset.Provider == "" || asset.ProviderID == "" || asset.Name == "" {
			return nil, domains.ErrInvalidDomain
		}
		existing, err := r.assetByProvider(ctx, tx, asset.Provider, asset.ProviderID)
		if err == nil {
			asset.ID = existing.ID
			asset.CreatedAt = existing.CreatedAt
		} else if errors.Is(err, domains.ErrDomainNotFound) {
			if asset.ID == "" {
				asset.ID = prefixedID("dom")
			}
			if asset.CreatedAt.IsZero() {
				asset.CreatedAt = now
			}
		} else {
			return nil, err
		}
		if asset.Certificate.Status == "" {
			asset.Certificate.Status = domains.CertificateStatusUnchecked
		}
		if asset.LastSyncedAt.IsZero() {
			asset.LastSyncedAt = now
		}
		asset.UpdatedAt = now
		nameServers, err := json.Marshal(asset.NameServers)
		if err != nil {
			return nil, fmt.Errorf("encode name servers: %w", err)
		}
		if _, err := tx.ExecContext(ctx, rebindSQL(`
			INSERT INTO domain_assets (
				id, provider, provider_id, name, status, type, name_servers_json,
				certificate_status, certificate_expires_at, certificate_days_remaining, certificate_checked_at, certificate_error,
				last_synced_at, created_at, updated_at
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT (provider, provider_id) DO UPDATE
			SET name = EXCLUDED.name,
			    status = EXCLUDED.status,
			    type = EXCLUDED.type,
			    name_servers_json = EXCLUDED.name_servers_json,
			    certificate_status = EXCLUDED.certificate_status,
			    certificate_expires_at = EXCLUDED.certificate_expires_at,
			    certificate_days_remaining = EXCLUDED.certificate_days_remaining,
			    certificate_checked_at = EXCLUDED.certificate_checked_at,
			    certificate_error = EXCLUDED.certificate_error,
			    last_synced_at = EXCLUDED.last_synced_at,
			    updated_at = EXCLUDED.updated_at
		`, r.dialect),
			asset.ID, asset.Provider, asset.ProviderID, asset.Name, asset.Status, asset.Type, string(nameServers),
			asset.Certificate.Status, nullZeroTime(asset.Certificate.ExpiresAt), nullZeroInt(asset.Certificate.DaysRemaining), nullZeroTime(asset.Certificate.CheckedAt), asset.Certificate.Error,
			nullZeroTime(asset.LastSyncedAt), asset.CreatedAt, asset.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("upsert domain asset: %w", err)
		}
		result = append(result, asset)
	}
	if err := tx.Commit(); err != nil {
		return nil, fmt.Errorf("commit domain upsert: %w", err)
	}
	return result, nil
}

// ListAssets returns domain assets sorted by name.
func (r *SQLDomainRepository) ListAssets(ctx context.Context) ([]domains.DomainAsset, error) {
	rows, err := r.db.QueryContext(ctx, rebindSQL(`
		SELECT id, provider, provider_id, name, status, type, name_servers_json,
		       certificate_status, certificate_expires_at, certificate_days_remaining, certificate_checked_at, certificate_error,
		       last_synced_at, created_at, updated_at
		FROM domain_assets
		ORDER BY name
	`, r.dialect))
	if err != nil {
		return nil, fmt.Errorf("list domain assets: %w", err)
	}
	defer rows.Close()
	return scanDomainAssets(rows)
}

// GetAsset returns one domain asset by platform ID.
func (r *SQLDomainRepository) GetAsset(ctx context.Context, id string) (domains.DomainAsset, error) {
	row := r.db.QueryRowContext(ctx, rebindSQL(`
		SELECT id, provider, provider_id, name, status, type, name_servers_json,
		       certificate_status, certificate_expires_at, certificate_days_remaining, certificate_checked_at, certificate_error,
		       last_synced_at, created_at, updated_at
		FROM domain_assets
		WHERE id = ?
	`, r.dialect), id)
	return scanDomainAsset(row)
}

// ReplaceDNSRecords replaces a domain's DNS snapshot after a provider sync.
func (r *SQLDomainRepository) ReplaceDNSRecords(ctx context.Context, assetID string, records []domains.DNSRecordSnapshot) error {
	if _, err := r.GetAsset(ctx, assetID); err != nil {
		return err
	}
	tx, err := r.db.BeginTx(ctx, nil)
	if err != nil {
		return fmt.Errorf("begin dns replace: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	if _, err := tx.ExecContext(ctx, rebindSQL(`DELETE FROM dns_record_snapshots WHERE domain_asset_id = ?`, r.dialect), assetID); err != nil {
		return fmt.Errorf("clear dns records: %w", err)
	}
	now := r.clock()
	for _, record := range records {
		record.ProviderID = strings.TrimSpace(record.ProviderID)
		record.Type = strings.TrimSpace(record.Type)
		record.Name = strings.TrimSpace(record.Name)
		if record.ProviderID == "" || record.Type == "" || record.Name == "" {
			return domains.ErrInvalidDomain
		}
		if record.ID == "" {
			record.ID = prefixedID("dns")
		}
		if record.SyncedAt.IsZero() {
			record.SyncedAt = now
		}
		if _, err := tx.ExecContext(ctx, rebindSQL(`
			INSERT INTO dns_record_snapshots (
				id, domain_asset_id, provider_id, type, name, content, ttl, proxied, priority, comment, synced_at, created_at, modified_at
			)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`, r.dialect), record.ID, assetID, record.ProviderID, record.Type, record.Name, record.Content, record.TTL, record.Proxied, nullIntPtr(record.Priority), record.Comment, record.SyncedAt, nullTimePtr(record.CreatedAt), nullTimePtr(record.ModifiedAt)); err != nil {
			return fmt.Errorf("insert dns record: %w", err)
		}
	}
	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit dns replace: %w", err)
	}
	return nil
}

// ListDNSRecords returns read-only DNS snapshots for a domain asset.
func (r *SQLDomainRepository) ListDNSRecords(ctx context.Context, assetID string) ([]domains.DNSRecordSnapshot, error) {
	if _, err := r.GetAsset(ctx, assetID); err != nil {
		return nil, err
	}
	rows, err := r.db.QueryContext(ctx, rebindSQL(`
		SELECT id, domain_asset_id, provider_id, type, name, content, ttl, proxied, priority, comment, synced_at, created_at, modified_at
		FROM dns_record_snapshots
		WHERE domain_asset_id = ?
		ORDER BY name, type
	`, r.dialect), assetID)
	if err != nil {
		return nil, fmt.Errorf("list dns records: %w", err)
	}
	defer rows.Close()

	var records []domains.DNSRecordSnapshot
	for rows.Next() {
		var record domains.DNSRecordSnapshot
		var priority sql.NullInt64
		var createdAt sql.NullTime
		var modifiedAt sql.NullTime
		if err := rows.Scan(&record.ID, &record.DomainAssetID, &record.ProviderID, &record.Type, &record.Name, &record.Content, &record.TTL, &record.Proxied, &priority, &record.Comment, &record.SyncedAt, &createdAt, &modifiedAt); err != nil {
			return nil, fmt.Errorf("scan dns record: %w", err)
		}
		if priority.Valid {
			value := int(priority.Int64)
			record.Priority = &value
		}
		if createdAt.Valid {
			record.CreatedAt = &createdAt.Time
		}
		if modifiedAt.Valid {
			record.ModifiedAt = &modifiedAt.Time
		}
		records = append(records, record)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate dns records: %w", err)
	}
	return records, nil
}

func (r *SQLDomainRepository) assetByProvider(ctx context.Context, queryer sqlQueryer, provider string, providerID string) (domains.DomainAsset, error) {
	row := queryer.QueryRowContext(ctx, rebindSQL(`
		SELECT id, provider, provider_id, name, status, type, name_servers_json,
		       certificate_status, certificate_expires_at, certificate_days_remaining, certificate_checked_at, certificate_error,
		       last_synced_at, created_at, updated_at
		FROM domain_assets
		WHERE provider = ? AND provider_id = ?
	`, r.dialect), provider, providerID)
	return scanDomainAsset(row)
}

func (r *SQLDomainRepository) clock() time.Time {
	if r.now == nil {
		return time.Now()
	}
	return r.now()
}

func scanStorageObjects(rows *sql.Rows) ([]storage.StorageObject, error) {
	var objects []storage.StorageObject
	for rows.Next() {
		object, err := scanStorageObject(rows)
		if err != nil {
			return nil, err
		}
		objects = append(objects, object)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate storage objects: %w", err)
	}
	return objects, nil
}

type storageScanner interface {
	Scan(dest ...any) error
}

func scanStorageObject(scanner storageScanner) (storage.StorageObject, error) {
	var object storage.StorageObject
	var createdBy sql.NullString
	if err := scanner.Scan(&object.ID, &object.Key, &object.Filename, &object.ContentType, &object.Size, &object.Visibility, &createdBy, &object.CreatedAt, &object.UpdatedAt); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return storage.StorageObject{}, storage.ErrObjectNotFound
		}
		return storage.StorageObject{}, fmt.Errorf("scan storage object: %w", err)
	}
	object.CreatedByUserID = createdBy.String
	return object, nil
}

type domainScanner interface {
	Scan(dest ...any) error
}

func scanDomainAssets(rows *sql.Rows) ([]domains.DomainAsset, error) {
	var assets []domains.DomainAsset
	for rows.Next() {
		asset, err := scanDomainAsset(rows)
		if err != nil {
			return nil, err
		}
		assets = append(assets, asset)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate domain assets: %w", err)
	}
	return assets, nil
}

func scanDomainAsset(scanner domainScanner) (domains.DomainAsset, error) {
	var asset domains.DomainAsset
	var nameServers string
	var expiresAt sql.NullTime
	var daysRemaining sql.NullInt64
	var checkedAt sql.NullTime
	var lastSyncedAt sql.NullTime
	if err := scanner.Scan(
		&asset.ID, &asset.Provider, &asset.ProviderID, &asset.Name, &asset.Status, &asset.Type, &nameServers,
		&asset.Certificate.Status, &expiresAt, &daysRemaining, &checkedAt, &asset.Certificate.Error,
		&lastSyncedAt, &asset.CreatedAt, &asset.UpdatedAt,
	); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return domains.DomainAsset{}, domains.ErrDomainNotFound
		}
		return domains.DomainAsset{}, fmt.Errorf("scan domain asset: %w", err)
	}
	_ = json.Unmarshal([]byte(nameServers), &asset.NameServers)
	if expiresAt.Valid {
		asset.Certificate.ExpiresAt = expiresAt.Time
	}
	if daysRemaining.Valid {
		asset.Certificate.DaysRemaining = int(daysRemaining.Int64)
	}
	if checkedAt.Valid {
		asset.Certificate.CheckedAt = checkedAt.Time
	}
	if lastSyncedAt.Valid {
		asset.LastSyncedAt = lastSyncedAt.Time
	}
	return asset, nil
}

func normalizeBlogInput(status blog.PostStatus, slug string, title string) (blog.PostStatus, string, string, error) {
	normalizedStatus, err := normalizeBlogStatus(status)
	if err != nil {
		return "", "", "", err
	}
	normalizedSlug := strings.ToLower(strings.TrimSpace(slug))
	if normalizedSlug == "" {
		return "", "", "", fmt.Errorf("%w: slug is required", blog.ErrInvalidPost)
	}
	normalizedTitle := strings.TrimSpace(title)
	if normalizedTitle == "" {
		return "", "", "", fmt.Errorf("%w: title is required", blog.ErrInvalidPost)
	}
	return normalizedStatus, normalizedSlug, normalizedTitle, nil
}

func normalizeBlogStatus(status blog.PostStatus) (blog.PostStatus, error) {
	if status == "" {
		return blog.StatusDraft, nil
	}
	switch status {
	case blog.StatusDraft, blog.StatusPublished, blog.StatusArchived:
		return status, nil
	default:
		return "", blog.ErrInvalidStatus
	}
}

func normalizeSQLBlogListFilter(filter blog.ListPostsFilter) (blog.ListPostsFilter, error) {
	if filter.Status != "" {
		status, err := normalizeBlogStatus(filter.Status)
		if err != nil {
			return blog.ListPostsFilter{}, err
		}
		filter.Status = status
	}
	if filter.Limit < 0 || filter.Offset < 0 {
		return blog.ListPostsFilter{}, blog.ErrInvalidPagination
	}
	return filter, nil
}

func validBlogTermType(termType blog.TermType) bool {
	return termType == blog.TermTypeCategory || termType == blog.TermTypeTag
}

func normalizeOptionalKey(key string) string {
	return strings.TrimLeft(strings.TrimSpace(key), "/")
}

func prefixedID(prefix string) string {
	bytes := make([]byte, 8)
	if _, err := rand.Read(bytes); err != nil {
		return fmt.Sprintf("%s_%d", prefix, time.Now().UnixNano())
	}
	return prefix + "_" + hex.EncodeToString(bytes)
}

func nullString(value string) any {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	return value
}

func nullTimePtr(value *time.Time) any {
	if value == nil || value.IsZero() {
		return nil
	}
	return *value
}

func nullZeroTime(value time.Time) any {
	if value.IsZero() {
		return nil
	}
	return value
}

func nullZeroInt(value int) any {
	if value == 0 {
		return nil
	}
	return value
}

func nullIntPtr(value *int) any {
	if value == nil {
		return nil
	}
	return *value
}
