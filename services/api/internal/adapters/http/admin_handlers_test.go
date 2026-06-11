package http

import (
	"encoding/json"
	stdhttp "net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/WeOpen/WeOpen/services/api/internal/domain/audit"
	"github.com/WeOpen/WeOpen/services/api/internal/domain/auth"
)

func TestAdminHandlersManageUsersRolesAndSessions(t *testing.T) {
	t.Parallel()

	store, err := auth.NewMemoryStore("admin@example.com", "admin")
	if err != nil {
		t.Fatalf("expected auth store: %v", err)
	}
	authService := auth.NewService(store)
	login, err := authService.Login(t.Context(), "admin@example.com", "admin")
	if err != nil {
		t.Fatalf("expected login: %v", err)
	}
	server := NewServer(ServerOptions{Auth: authService, Audit: audit.NewService()})

	createReq := httptest.NewRequest(stdhttp.MethodPost, "/api/admin/users", strings.NewReader(`{"email":"operator@example.com","displayName":"Operator","password":"Stronger!2345","roles":["admin"]}`))
	createReq.Header.Set("Authorization", "Bearer "+login.Token)
	createReq.Header.Set("Content-Type", "application/json")
	createRec := httptest.NewRecorder()
	server.ServeHTTP(createRec, createReq)
	if createRec.Code != stdhttp.StatusCreated {
		t.Fatalf("expected user create status %d, got %d body=%s", stdhttp.StatusCreated, createRec.Code, createRec.Body.String())
	}
	var created map[string]auth.User
	if err := json.Unmarshal(createRec.Body.Bytes(), &created); err != nil {
		t.Fatalf("expected created user JSON: %v", err)
	}
	if !created["user"].MustChangePassword {
		t.Fatal("expected created user to require first password change")
	}

	rolesReq := httptest.NewRequest(stdhttp.MethodGet, "/api/admin/roles", nil)
	rolesReq.Header.Set("Authorization", "Bearer "+login.Token)
	rolesRec := httptest.NewRecorder()
	server.ServeHTTP(rolesRec, rolesReq)
	if rolesRec.Code != stdhttp.StatusOK || !strings.Contains(rolesRec.Body.String(), "user:manage") {
		t.Fatalf("expected roles with user:manage, got %d body=%s", rolesRec.Code, rolesRec.Body.String())
	}

	sessionsReq := httptest.NewRequest(stdhttp.MethodGet, "/api/admin/sessions", nil)
	sessionsReq.Header.Set("Authorization", "Bearer "+login.Token)
	sessionsRec := httptest.NewRecorder()
	server.ServeHTTP(sessionsRec, sessionsReq)
	if sessionsRec.Code != stdhttp.StatusOK || !strings.Contains(sessionsRec.Body.String(), "ses_") {
		t.Fatalf("expected sessions list, got %d body=%s", sessionsRec.Code, sessionsRec.Body.String())
	}
}
