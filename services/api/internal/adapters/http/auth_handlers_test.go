package http

import (
	"encoding/json"
	stdhttp "net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/WeOpen/WeOpen/services/api/internal/domain/audit"
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

	var loginBody map[string]any
	if err := json.Unmarshal(loginRec.Body.Bytes(), &loginBody); err != nil {
		t.Fatalf("expected login JSON: %v", err)
	}
	if _, ok := loginBody["token"]; ok {
		t.Fatal("expected login response to redact raw session token")
	}
	if _, ok := loginBody["expiresAt"]; !ok {
		t.Fatal("expected login response to include expiry")
	}
	cookie := sessionCookieFromRecorder(t, loginRec)
	if cookie.Value == "" {
		t.Fatal("expected session cookie value")
	}

	meReq := httptest.NewRequest(stdhttp.MethodGet, "/api/me", nil)
	meReq.AddCookie(cookie)
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

func TestAuthHandlersRateLimitRepeatedFailedLogins(t *testing.T) {
	t.Parallel()

	store, err := auth.NewMemoryStore("admin@example.com", "admin")
	if err != nil {
		t.Fatalf("expected auth store: %v", err)
	}
	server := NewServer(ServerOptions{Auth: auth.NewService(store)})

	for attempt := 0; attempt < loginFailureLimit; attempt++ {
		req := httptest.NewRequest(stdhttp.MethodPost, "/api/auth/login", strings.NewReader(`{"email":"admin@example.com","password":"wrong"}`))
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()
		server.ServeHTTP(rec, req)
		if rec.Code != stdhttp.StatusUnauthorized {
			t.Fatalf("expected failed attempt %d to be unauthorized, got %d body=%s", attempt+1, rec.Code, rec.Body.String())
		}
	}

	req := httptest.NewRequest(stdhttp.MethodPost, "/api/auth/login", strings.NewReader(`{"email":"admin@example.com","password":"admin"}`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	server.ServeHTTP(rec, req)

	if rec.Code != stdhttp.StatusTooManyRequests {
		t.Fatalf("expected rate limited login status %d, got %d body=%s", stdhttp.StatusTooManyRequests, rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "AUTH_RATE_LIMITED") {
		t.Fatalf("expected rate limit error code, got %s", rec.Body.String())
	}
}

func TestAuthHandlersAuditLoginFailureAndSuccess(t *testing.T) {
	t.Parallel()

	store, err := auth.NewMemoryStore("admin@example.com", "admin")
	if err != nil {
		t.Fatalf("expected auth store: %v", err)
	}
	auditService := audit.NewService()
	server := NewServer(ServerOptions{Auth: auth.NewService(store), Audit: auditService})

	failedReq := httptest.NewRequest(stdhttp.MethodPost, "/api/auth/login", strings.NewReader(`{"email":"admin@example.com","password":"wrong"}`))
	failedReq.Header.Set("Content-Type", "application/json")
	server.ServeHTTP(httptest.NewRecorder(), failedReq)

	successReq := httptest.NewRequest(stdhttp.MethodPost, "/api/auth/login", strings.NewReader(`{"email":"admin@example.com","password":"admin"}`))
	successReq.Header.Set("Content-Type", "application/json")
	server.ServeHTTP(httptest.NewRecorder(), successReq)

	entries, err := auditService.List(t.Context())
	if err != nil {
		t.Fatalf("expected audit entries: %v", err)
	}
	if len(entries) < 2 {
		t.Fatalf("expected login audit entries, got %+v", entries)
	}
	if entries[0].Action != "auth.login_succeeded" {
		t.Fatalf("expected newest audit success, got %+v", entries[0])
	}
	if entries[1].Action != "auth.login_failed" || entries[1].Metadata["reason"] != "invalid_credentials" {
		t.Fatalf("expected failed login audit reason, got %+v", entries[1])
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

func sessionCookieFromRecorder(t *testing.T, rec *httptest.ResponseRecorder) *stdhttp.Cookie {
	t.Helper()
	for _, cookie := range rec.Result().Cookies() {
		if cookie.Name == auth.SessionCookieName {
			return cookie
		}
	}
	t.Fatalf("expected %s cookie, got %+v", auth.SessionCookieName, rec.Result().Cookies())
	return nil
}
