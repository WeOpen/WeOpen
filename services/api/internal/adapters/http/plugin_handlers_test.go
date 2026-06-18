package http

import (
	"encoding/json"
	stdhttp "net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/WeOpen/WeOpen/platform/core/plugin"
	"github.com/WeOpen/WeOpen/services/api/internal/domain/auth"
	"github.com/WeOpen/WeOpen/services/api/internal/domain/pluginstate"
)

func TestPluginHandlersListAndUpdatePluginState(t *testing.T) {
	t.Parallel()

	states := pluginstate.NewMemoryStore()
	server, token := newAuthenticatedPluginServer(t, states)

	listReq := httptest.NewRequest(stdhttp.MethodGet, "/api/plugins", nil)
	listReq.Header.Set("Authorization", "Bearer "+token)
	listRec := httptest.NewRecorder()
	server.ServeHTTP(listRec, listReq)

	if listRec.Code != stdhttp.StatusOK {
		t.Fatalf("expected plugin list status %d, got %d body=%s", stdhttp.StatusOK, listRec.Code, listRec.Body.String())
	}
	var listBody pluginsResponse
	if err := json.Unmarshal(listRec.Body.Bytes(), &listBody); err != nil {
		t.Fatalf("expected plugin JSON: %v", err)
	}
	if len(listBody.Plugins) != 1 {
		t.Fatalf("expected 1 plugin, got %d", len(listBody.Plugins))
	}
	if !listBody.Plugins[0].Enabled {
		t.Fatal("expected plugin to start enabled")
	}
	if listBody.Plugins[0].RouteCount != 1 || listBody.Plugins[0].RoutePrefix != "/api/plugins/blog" {
		t.Fatalf("expected plugin route metadata, got %+v", listBody.Plugins[0])
	}
	if listBody.Plugins[0].RouteGroup == nil || listBody.Plugins[0].RouteGroup.ID != "plugin-blog" {
		t.Fatalf("expected plugin route catalog, got %+v", listBody.Plugins[0].RouteGroup)
	}

	patchReq := httptest.NewRequest(stdhttp.MethodPatch, "/api/plugins/blog", strings.NewReader(`{"enabled":false}`))
	patchReq.Header.Set("Authorization", "Bearer "+token)
	patchReq.Header.Set("Content-Type", "application/json")
	patchRec := httptest.NewRecorder()
	server.ServeHTTP(patchRec, patchReq)

	if patchRec.Code != stdhttp.StatusOK {
		t.Fatalf("expected plugin update status %d, got %d body=%s", stdhttp.StatusOK, patchRec.Code, patchRec.Body.String())
	}
	var patchBody pluginsResponse
	if err := json.Unmarshal(patchRec.Body.Bytes(), &patchBody); err != nil {
		t.Fatalf("expected plugin update JSON: %v", err)
	}
	if patchBody.Plugins[0].Enabled {
		t.Fatal("expected plugin to be disabled")
	}

	secondServer, secondToken := newAuthenticatedPluginServer(t, states)
	secondListReq := httptest.NewRequest(stdhttp.MethodGet, "/api/plugins", nil)
	secondListReq.Header.Set("Authorization", "Bearer "+secondToken)
	secondListRec := httptest.NewRecorder()
	secondServer.ServeHTTP(secondListRec, secondListReq)

	if secondListRec.Code != stdhttp.StatusOK {
		t.Fatalf("expected second plugin list status %d, got %d body=%s", stdhttp.StatusOK, secondListRec.Code, secondListRec.Body.String())
	}
	var secondListBody pluginsResponse
	if err := json.Unmarshal(secondListRec.Body.Bytes(), &secondListBody); err != nil {
		t.Fatalf("expected second plugin JSON: %v", err)
	}
	if secondListBody.Plugins[0].Enabled {
		t.Fatal("expected plugin disabled state to come from the shared state store")
	}
}

func TestPluginHandlersRequireManagePermissionForUpdates(t *testing.T) {
	t.Parallel()

	session, token, err := auth.NewSession("usr_reader", time.Now(), time.Hour)
	if err != nil {
		t.Fatalf("expected session: %v", err)
	}
	authService := auth.NewService(&permissionTestStore{
		user: auth.User{
			ID:          "usr_reader",
			Email:       "reader@example.com",
			DisplayName: "Reader",
			Status:      auth.UserStatusActive,
			Permissions: []plugin.Permission{plugin.PermissionBlogRead},
		},
		session: session,
	})
	registry := plugin.NewRegistry()
	registry.MustRegister(plugin.NewStaticPlugin(plugin.Manifest{
		ID:      "blog",
		Name:    "Blog",
		Version: "0.1.0",
	}))
	server := NewServer(ServerOptions{Auth: authService, Plugins: registry, PluginStates: pluginstate.NewMemoryStore()})

	req := httptest.NewRequest(stdhttp.MethodPatch, "/api/plugins/blog", strings.NewReader(`{"enabled":false}`))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	server.ServeHTTP(rec, req)

	if rec.Code != stdhttp.StatusForbidden {
		t.Fatalf("expected forbidden plugin update, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func newAuthenticatedPluginServer(t *testing.T, states pluginstate.Store) (stdhttp.Handler, string) {
	t.Helper()

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
	registry.MustRegister(plugin.NewStaticPlugin(plugin.Manifest{
		ID:          "blog",
		Name:        "博客管理",
		Description: "管理文章",
		Version:     "0.1.0",
		Permissions: []plugin.Permission{plugin.PermissionBlogRead},
	}))

	return NewServer(ServerOptions{
		Auth:         authService,
		Plugins:      registry,
		PluginStates: states,
		PluginRoutes: []PluginRoute{
			{
				Prefix:  "/api/plugins/blog",
				Handler: stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, r *stdhttp.Request) {}),
				Catalog: RouteGroup{
					ID:    "plugin-blog",
					Title: "Blog Plugin",
					Routes: []RouteDefinition{
						{ID: "plugin.blog.posts.list", Method: stdhttp.MethodGet, Path: "/api/plugins/blog/posts"},
					},
				},
			},
		},
	}), login.Token
}
