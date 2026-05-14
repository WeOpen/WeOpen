package http

import (
	"encoding/json"
	stdhttp "net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/WeOpen/WeOpen/services/api/internal/adapters/secrets"
	"github.com/WeOpen/WeOpen/services/api/internal/domain/audit"
	"github.com/WeOpen/WeOpen/services/api/internal/domain/auth"
)

func TestSettingsHandlerStoresSecretsWithoutReturningRawValues(t *testing.T) {
	t.Parallel()

	server, token := newAuthenticatedSettingsServer(t)
	req := httptest.NewRequest(stdhttp.MethodPatch, "/api/settings", strings.NewReader(`{"cloudflareApiToken":"cf-secret-token"}`))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	server.ServeHTTP(rec, req)

	if rec.Code != stdhttp.StatusOK {
		t.Fatalf("expected settings status %d, got %d body=%s", stdhttp.StatusOK, rec.Code, rec.Body.String())
	}
	if strings.Contains(rec.Body.String(), "cf-secret-token") {
		t.Fatal("expected raw secret to be absent from response")
	}

	var body settingsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("expected settings JSON: %v", err)
	}
	if len(body.Secrets) != 1 {
		t.Fatalf("expected 1 secret summary, got %d", len(body.Secrets))
	}
	if body.Secrets[0].Last4 != "oken" {
		t.Fatalf("expected redacted last4 oken, got %q", body.Secrets[0].Last4)
	}
}

func TestSettingsHandlerRecordsAuditLog(t *testing.T) {
	t.Parallel()

	server, token := newAuthenticatedSettingsServer(t)
	req := httptest.NewRequest(stdhttp.MethodPatch, "/api/settings", strings.NewReader(`{"vercelApiToken":"vercel-secret"}`))
	req.Header.Set("Authorization", "Bearer "+token)
	req.Header.Set("Content-Type", "application/json")
	server.ServeHTTP(httptest.NewRecorder(), req)

	auditReq := httptest.NewRequest(stdhttp.MethodGet, "/api/audit-logs", nil)
	auditReq.Header.Set("Authorization", "Bearer "+token)
	auditRec := httptest.NewRecorder()
	server.ServeHTTP(auditRec, auditReq)

	if auditRec.Code != stdhttp.StatusOK {
		t.Fatalf("expected audit status %d, got %d body=%s", stdhttp.StatusOK, auditRec.Code, auditRec.Body.String())
	}
	if !strings.Contains(auditRec.Body.String(), "settings.update") {
		t.Fatalf("expected settings.update audit entry, got %s", auditRec.Body.String())
	}
}

func newAuthenticatedSettingsServer(t *testing.T) (stdhttp.Handler, string) {
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

	server := NewServer(ServerOptions{
		Auth:    authService,
		Secrets: secrets.NewService(secrets.NewMemoryStore(), secrets.NewCrypto("test-key")),
		Audit:   audit.NewService(),
	})
	return server, login.Token
}
