package http

import (
	"encoding/json"
	stdhttp "net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/WeOpen/WeOpen/services/api/internal/auth"
)

func TestAuthHandlersLoginAndReadCurrentUser(t *testing.T) {
	t.Parallel()

	store, err := auth.NewMemoryStore("admin@example.com", "admin")
	if err != nil {
		t.Fatalf("expected auth store: %v", err)
	}
	server := NewServer(ServerOptions{Auth: auth.NewService(store)})

	loginReq := httptest.NewRequest(stdhttp.MethodPost, "/api/auth/login", strings.NewReader(`{"email":"admin@example.com","password":"admin"}`))
	loginReq.Header.Set("Content-Type", "application/json")
	loginRec := httptest.NewRecorder()

	server.ServeHTTP(loginRec, loginReq)

	if loginRec.Code != stdhttp.StatusOK {
		t.Fatalf("expected login status %d, got %d body=%s", stdhttp.StatusOK, loginRec.Code, loginRec.Body.String())
	}

	var loginBody loginResponse
	if err := json.Unmarshal(loginRec.Body.Bytes(), &loginBody); err != nil {
		t.Fatalf("expected login JSON: %v", err)
	}
	if loginBody.Token == "" {
		t.Fatal("expected login token")
	}

	meReq := httptest.NewRequest(stdhttp.MethodGet, "/api/me", nil)
	meReq.Header.Set("Authorization", "Bearer "+loginBody.Token)
	meRec := httptest.NewRecorder()

	server.ServeHTTP(meRec, meReq)

	if meRec.Code != stdhttp.StatusOK {
		t.Fatalf("expected me status %d, got %d body=%s", stdhttp.StatusOK, meRec.Code, meRec.Body.String())
	}
	var meBody meResponse
	if err := json.Unmarshal(meRec.Body.Bytes(), &meBody); err != nil {
		t.Fatalf("expected me JSON: %v", err)
	}
	if meBody.User.Email != "admin@example.com" {
		t.Fatalf("expected current user email, got %q", meBody.User.Email)
	}
}
