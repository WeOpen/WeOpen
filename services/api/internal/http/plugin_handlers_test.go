package http

import (
	"encoding/json"
	stdhttp "net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/WeOpen/WeOpen/internal/core/plugin"
	"github.com/WeOpen/WeOpen/services/api/internal/auth"
)

func TestPluginHandlersListAndUpdatePluginState(t *testing.T) {
	t.Parallel()

	server, token := newAuthenticatedPluginServer(t)

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
}

func newAuthenticatedPluginServer(t *testing.T) (stdhttp.Handler, string) {
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

	return NewServer(ServerOptions{Auth: authService, Plugins: registry}), login.Token
}
