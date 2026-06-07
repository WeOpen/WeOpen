package http

import (
	"encoding/json"
	stdhttp "net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/WeOpen/WeOpen/services/api/internal/domain/auth"
)

func TestAuthHandlersSetSecureCookieWhenConfigured(t *testing.T) {
	t.Parallel()

	store, err := auth.NewMemoryStore("admin@example.com", "admin")
	if err != nil {
		t.Fatalf("expected auth store: %v", err)
	}
	server := NewServer(ServerOptions{Auth: auth.NewService(store), SecureCookies: true})
	loginReq := httptest.NewRequest(stdhttp.MethodPost, "/api/auth/login", strings.NewReader(`{"email":"admin@example.com","password":"admin"}`))
	loginReq.Header.Set("Content-Type", "application/json")
	loginRec := httptest.NewRecorder()

	server.ServeHTTP(loginRec, loginReq)

	if loginRec.Code != stdhttp.StatusOK {
		t.Fatalf("expected login status %d, got %d body=%s", stdhttp.StatusOK, loginRec.Code, loginRec.Body.String())
	}
	cookies := loginRec.Result().Cookies()
	if len(cookies) != 1 || cookies[0].Name != auth.SessionCookieName {
		t.Fatalf("expected session cookie, got %+v", cookies)
	}
	if !cookies[0].Secure {
		t.Fatalf("expected secure session cookie, got %+v", cookies[0])
	}
}

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

func TestAuthHandlersRejectDisabledCurrentUserSession(t *testing.T) {
	t.Parallel()

	session, token, err := auth.NewSession("usr_disabled", time.Now(), time.Hour)
	if err != nil {
		t.Fatalf("expected session: %v", err)
	}
	server := NewServer(ServerOptions{
		Auth: auth.NewService(&permissionTestStore{
			user: auth.User{
				ID:          "usr_disabled",
				Email:       "disabled@example.com",
				DisplayName: "Disabled",
				Status:      auth.UserStatusDisabled,
			},
			session: session,
		}),
	})

	req := httptest.NewRequest(stdhttp.MethodGet, "/api/me", nil)
	req.Header.Set("Authorization", "Bearer "+token)
	rec := httptest.NewRecorder()

	server.ServeHTTP(rec, req)

	if rec.Code != stdhttp.StatusForbidden {
		t.Fatalf("expected disabled session status %d, got %d body=%s", stdhttp.StatusForbidden, rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "AUTH_USER_DISABLED") {
		t.Fatalf("expected disabled user error code, got %s", rec.Body.String())
	}
}
