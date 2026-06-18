package http

import (
	"encoding/json"
	stdhttp "net/http"
	"net/http/httptest"
	"testing"

	"github.com/WeOpen/WeOpen/platform/core/plugin"
	"github.com/WeOpen/WeOpen/services/api/internal/domain/auth"
)

func TestRouteCatalogRequiresAuth(t *testing.T) {
	t.Parallel()

	authStore, err := auth.NewMemoryStore("admin@example.com", "admin")
	if err != nil {
		t.Fatalf("expected auth store: %v", err)
	}
	server := NewServer(ServerOptions{Auth: auth.NewService(authStore)})

	req := httptest.NewRequest(stdhttp.MethodGet, "/api/routes", nil)
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)

	if rec.Code != stdhttp.StatusUnauthorized {
		t.Fatalf("expected unauthorized status, got %d body=%s", rec.Code, rec.Body.String())
	}
}

func TestRouteCatalogReturnsCoreAndPluginRoutes(t *testing.T) {
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
	server := NewServer(ServerOptions{
		Auth: authService,
		PluginRoutes: []PluginRoute{
			{
				Prefix:  "/api/plugins/example",
				Handler: stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, r *stdhttp.Request) {}),
				Catalog: RouteGroup{
					ID:    "plugin-example",
					Title: "Example Plugin",
					Routes: []RouteDefinition{
						{
							ID:          "plugin.example.items",
							Method:      stdhttp.MethodGet,
							Path:        "/api/plugins/example/items",
							Summary:     "List example items.",
							Auth:        "Permission",
							Permissions: []plugin.Permission{plugin.PermissionPluginManage},
						},
					},
				},
			},
		},
	})

	req := httptest.NewRequest(stdhttp.MethodGet, "/api/routes", nil)
	req.Header.Set("Authorization", "Bearer "+login.Token)
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)

	if rec.Code != stdhttp.StatusOK {
		t.Fatalf("expected ok status, got %d body=%s", rec.Code, rec.Body.String())
	}
	var body routeCatalogResponse
	if err := json.NewDecoder(rec.Body).Decode(&body); err != nil {
		t.Fatalf("expected JSON response: %v", err)
	}
	if !hasRoute(body.Groups, "/api/routes") {
		t.Fatalf("expected core route catalog entry, got %#v", body.Groups)
	}
	if !hasRouteWithMethod(body.Groups, "/api/auth/password", stdhttp.MethodPost) {
		t.Fatalf("expected password route catalog entry to use POST, got %#v", body.Groups)
	}
	if !hasRoute(body.Groups, "/api/plugins/example/items") {
		t.Fatalf("expected plugin route catalog entry, got %#v", body.Groups)
	}
}

func TestRouteCatalogRejectsUnsafeMethods(t *testing.T) {
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
	server := NewServer(ServerOptions{Auth: authService})

	req := httptest.NewRequest(stdhttp.MethodPost, "/api/routes", nil)
	req.Header.Set("Authorization", "Bearer "+login.Token)
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)

	if rec.Code != stdhttp.StatusMethodNotAllowed {
		t.Fatalf("expected method not allowed, got %d body=%s", rec.Code, rec.Body.String())
	}
	if rec.Header().Get("Allow") != stdhttp.MethodGet {
		t.Fatalf("expected Allow GET, got %q", rec.Header().Get("Allow"))
	}
}

func hasRoute(groups []RouteGroup, path string) bool {
	for _, group := range groups {
		for _, route := range group.Routes {
			if route.Path == path {
				return true
			}
		}
	}
	return false
}

func hasRouteWithMethod(groups []RouteGroup, path string, method string) bool {
	for _, group := range groups {
		for _, route := range group.Routes {
			if route.Path == path && route.Method == method {
				return true
			}
		}
	}
	return false
}
