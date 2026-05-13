package http

import (
	stdhttp "net/http"
	"net/http/httptest"
	"testing"

	"github.com/WeOpen/WeOpen/services/api/internal/auth"
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
