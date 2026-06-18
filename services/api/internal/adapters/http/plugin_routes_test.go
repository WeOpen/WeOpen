package http

import (
	"context"
	stdhttp "net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/WeOpen/WeOpen/platform/core/plugin"
	"github.com/WeOpen/WeOpen/services/api/internal/domain/auth"
	"github.com/WeOpen/WeOpen/services/api/internal/domain/pluginstate"
)

func TestPluginRoutesRequireAuthAndForwardActor(t *testing.T) {
	t.Parallel()

	authStore, err := auth.NewMemoryStore("admin@example.com", "admin")
	if err != nil {
		t.Fatalf("expected auth store: %v", err)
	}
	authService := auth.NewService(authStore)
	login, err := authService.Login(t.Context(), "admin@example.com", "admin")
	if err != nil {
		t.Fatalf("expected login: %v", err)
	}

	var actorID string
	pluginHandler := stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, r *stdhttp.Request) {
		actorID = r.Header.Get("X-WeOpen-Actor-ID")
		w.WriteHeader(stdhttp.StatusNoContent)
	})
	server := NewServer(ServerOptions{
		Auth: authService,
		PluginRoutes: []PluginRoute{
			{Prefix: "/api/plugins/blog", Handler: pluginHandler},
		},
	})

	unauthorizedReq := httptest.NewRequest(stdhttp.MethodGet, "/api/plugins/blog/posts", nil)
	unauthorizedRec := httptest.NewRecorder()
	server.ServeHTTP(unauthorizedRec, unauthorizedReq)
	if unauthorizedRec.Code != stdhttp.StatusUnauthorized {
		t.Fatalf("expected unauthorized status, got %d", unauthorizedRec.Code)
	}

	authorizedReq := httptest.NewRequest(stdhttp.MethodGet, "/api/plugins/blog/posts", nil)
	authorizedReq.Header.Set("Authorization", "Bearer "+login.Token)
	authorizedRec := httptest.NewRecorder()
	server.ServeHTTP(authorizedRec, authorizedReq)
	if authorizedRec.Code != stdhttp.StatusNoContent {
		t.Fatalf("expected plugin route status, got %d body=%s", authorizedRec.Code, authorizedRec.Body.String())
	}
	if actorID != login.User.ID {
		t.Fatalf("expected actor id %q, got %q", login.User.ID, actorID)
	}
}

func TestPluginRoutesDenyMissingPermissions(t *testing.T) {
	t.Parallel()

	session, token, err := auth.NewSession("usr_limited", time.Now(), time.Hour)
	if err != nil {
		t.Fatalf("expected session: %v", err)
	}
	authService := auth.NewService(&permissionTestStore{
		user: auth.User{
			ID:          "usr_limited",
			Email:       "limited@example.com",
			DisplayName: "Limited",
		},
		session: session,
	})
	pluginHandler := stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, r *stdhttp.Request) {
		w.WriteHeader(stdhttp.StatusNoContent)
	})
	server := NewServer(ServerOptions{
		Auth: authService,
		PluginRoutes: []PluginRoute{
			{
				Prefix:      "/api/plugins/blog",
				Handler:     pluginHandler,
				Permissions: []plugin.Permission{plugin.PermissionBlogRead},
			},
		},
	})

	req := httptest.NewRequest(stdhttp.MethodGet, "/api/plugins/blog/posts", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	server.ServeHTTP(rec, req)

	if rec.Code != stdhttp.StatusForbidden {
		t.Fatalf("expected forbidden status, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestPluginRoutesApplyMethodPermissionRules(t *testing.T) {
	t.Parallel()

	session, token, err := auth.NewSession("usr_blog_reader", time.Now(), time.Hour)
	if err != nil {
		t.Fatalf("expected session: %v", err)
	}
	authService := auth.NewService(&permissionTestStore{
		user: auth.User{
			ID:          "usr_blog_reader",
			Email:       "reader@example.com",
			DisplayName: "Reader",
			Status:      auth.UserStatusActive,
			Permissions: []plugin.Permission{plugin.PermissionBlogRead},
		},
		session: session,
	})
	pluginHandler := stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, r *stdhttp.Request) {
		w.WriteHeader(stdhttp.StatusNoContent)
	})
	server := NewServer(ServerOptions{
		Auth: authService,
		PluginRoutes: []PluginRoute{
			{
				Prefix:      "/api/plugins/blog",
				Handler:     pluginHandler,
				Permissions: []plugin.Permission{plugin.PermissionBlogRead},
				PermissionRules: []PermissionRule{
					{Method: stdhttp.MethodGet, Path: "/posts", Permissions: []plugin.Permission{plugin.PermissionBlogRead}},
					{Method: stdhttp.MethodPost, Path: "/posts", Permissions: []plugin.Permission{plugin.PermissionBlogWrite}},
				},
			},
		},
	})

	readReq := httptest.NewRequest(stdhttp.MethodGet, "/api/plugins/blog/posts", nil)
	readReq.Header.Set("Authorization", "Bearer "+token)
	readRec := httptest.NewRecorder()
	server.ServeHTTP(readRec, readReq)
	if readRec.Code != stdhttp.StatusNoContent {
		t.Fatalf("expected read to pass, got %d body=%s", readRec.Code, readRec.Body.String())
	}

	writeReq := httptest.NewRequest(stdhttp.MethodPost, "/api/plugins/blog/posts", nil)
	writeReq.Header.Set("Authorization", "Bearer "+token)
	writeRec := httptest.NewRecorder()
	server.ServeHTTP(writeRec, writeReq)
	if writeRec.Code != stdhttp.StatusForbidden {
		t.Fatalf("expected write to be forbidden, got %d body=%s", writeRec.Code, writeRec.Body.String())
	}
}

func TestPluginRoutesFailClosedForUnmatchedUnsafeRules(t *testing.T) {
	t.Parallel()

	session, token, err := auth.NewSession("usr_blog_reader", time.Now(), time.Hour)
	if err != nil {
		t.Fatalf("expected session: %v", err)
	}
	authService := auth.NewService(&permissionTestStore{
		user: auth.User{
			ID:          "usr_blog_reader",
			Email:       "reader@example.com",
			DisplayName: "Reader",
			Status:      auth.UserStatusActive,
			Permissions: []plugin.Permission{plugin.PermissionBlogRead, plugin.PermissionBlogWrite},
		},
		session: session,
	})
	pluginHandler := stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, r *stdhttp.Request) {
		w.WriteHeader(stdhttp.StatusNoContent)
	})
	server := NewServer(ServerOptions{
		Auth: authService,
		PluginRoutes: []PluginRoute{
			{
				Prefix:      "/api/plugins/blog",
				Handler:     pluginHandler,
				Permissions: []plugin.Permission{plugin.PermissionBlogRead},
				PermissionRules: []PermissionRule{
					{Method: stdhttp.MethodGet, Path: "/posts", Permissions: []plugin.Permission{plugin.PermissionBlogRead}},
				},
			},
		},
	})

	req := httptest.NewRequest(stdhttp.MethodPost, "/api/plugins/blog/unmatched", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)

	if rec.Code != stdhttp.StatusForbidden {
		t.Fatalf("expected unmatched unsafe route to fail closed, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestPluginRoutesUseBasePermissionsForUnmatchedReadRules(t *testing.T) {
	t.Parallel()

	session, token, err := auth.NewSession("usr_blog_reader", time.Now(), time.Hour)
	if err != nil {
		t.Fatalf("expected session: %v", err)
	}
	authService := auth.NewService(&permissionTestStore{
		user: auth.User{
			ID:          "usr_blog_reader",
			Email:       "reader@example.com",
			DisplayName: "Reader",
			Status:      auth.UserStatusActive,
			Permissions: []plugin.Permission{plugin.PermissionBlogRead},
		},
		session: session,
	})
	pluginHandler := stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, r *stdhttp.Request) {
		w.WriteHeader(stdhttp.StatusNoContent)
	})
	server := NewServer(ServerOptions{
		Auth: authService,
		PluginRoutes: []PluginRoute{
			{
				Prefix:      "/api/plugins/blog",
				Handler:     pluginHandler,
				Permissions: []plugin.Permission{plugin.PermissionBlogRead},
				PermissionRules: []PermissionRule{
					{Method: stdhttp.MethodPost, Path: "/posts", Permissions: []plugin.Permission{plugin.PermissionBlogWrite}},
				},
			},
		},
	})

	req := httptest.NewRequest(stdhttp.MethodGet, "/api/plugins/blog/unmatched", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)

	if rec.Code != stdhttp.StatusNoContent {
		t.Fatalf("expected unmatched read route to use base permissions, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestPluginRoutesDenyDisabledPlugins(t *testing.T) {
	t.Parallel()

	authStore, err := auth.NewMemoryStore("admin@example.com", "admin")
	if err != nil {
		t.Fatalf("expected auth store: %v", err)
	}
	authService := auth.NewService(authStore)
	login, err := authService.Login(t.Context(), "admin@example.com", "admin")
	if err != nil {
		t.Fatalf("expected login: %v", err)
	}
	registry := plugin.NewRegistry()
	manifest := plugin.Manifest{
		ID:          "blog",
		Name:        "Blog",
		Version:     "0.1.0",
		Permissions: []plugin.Permission{plugin.PermissionBlogRead},
	}
	registry.MustRegister(plugin.NewStaticPlugin(manifest))
	states := pluginstate.NewMemoryStore()
	if err := states.Seed(t.Context(), []plugin.Manifest{manifest}); err != nil {
		t.Fatalf("expected plugin seed: %v", err)
	}
	if err := states.SetEnabled(t.Context(), manifest, false); err != nil {
		t.Fatalf("expected plugin disable: %v", err)
	}
	pluginHandler := stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, r *stdhttp.Request) {
		w.WriteHeader(stdhttp.StatusNoContent)
	})
	server := NewServer(ServerOptions{
		Auth:         authService,
		Plugins:      registry,
		PluginStates: states,
		PluginRoutes: []PluginRoute{
			{
				Prefix:      "/api/plugins/blog",
				Handler:     pluginHandler,
				Permissions: []plugin.Permission{plugin.PermissionBlogRead},
			},
		},
	})

	req := httptest.NewRequest(stdhttp.MethodGet, "/api/plugins/blog/posts", nil)
	req.Header.Set("Authorization", "Bearer "+login.Token)
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)

	if rec.Code != stdhttp.StatusForbidden {
		t.Fatalf("expected disabled plugin route to be forbidden, got %d body=%s", rec.Code, rec.Body.String())
	}
}

type permissionTestStore struct {
	user    auth.User
	session auth.Session
}

func (s *permissionTestStore) UserByEmail(context.Context, string) (auth.User, error) {
	return auth.User{}, auth.ErrInvalidCredentials
}

func (s *permissionTestStore) UserByID(context.Context, string) (auth.User, error) {
	return s.user, nil
}

func (s *permissionTestStore) SaveSession(context.Context, auth.Session) error {
	return nil
}

func (s *permissionTestStore) DeleteSession(context.Context, string) error {
	return nil
}

func (s *permissionTestStore) SessionByTokenHash(_ context.Context, tokenHash string) (auth.Session, error) {
	if tokenHash != s.session.TokenHash {
		return auth.Session{}, auth.ErrSessionNotFound
	}
	return s.session, nil
}

func (s *permissionTestStore) TouchLastLogin(context.Context, string, time.Time) error {
	return nil
}
