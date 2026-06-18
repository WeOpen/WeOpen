package devtools

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHTTPHandlerListsBackendOwnedToolCatalog(t *testing.T) {
	t.Parallel()

	req := httptest.NewRequest(http.MethodGet, "/tools", nil)
	rec := httptest.NewRecorder()

	NewHTTPHandler().ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d body=%s, want %d", rec.Code, rec.Body.String(), http.StatusOK)
	}
	var body toolsResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("expected tools JSON: %v", err)
	}
	if len(body.Tools) < 10 {
		t.Fatalf("tools = %d, want at least 10", len(body.Tools))
	}
	if len(body.Panels) == 0 || body.Panels[0].ID != "json" {
		t.Fatalf("panels = %+v, want backend panel ordering", body.Panels)
	}
	if body.Tools[0].PanelID == "" {
		t.Fatalf("tool missing panel ID: %+v", body.Tools[0])
	}
}

func TestHTTPHandlerRejectsUnsupportedToolMethods(t *testing.T) {
	t.Parallel()

	req := httptest.NewRequest(http.MethodPost, "/tools", nil)
	rec := httptest.NewRecorder()

	NewHTTPHandler().ServeHTTP(rec, req)

	if rec.Code != http.StatusMethodNotAllowed {
		t.Fatalf("status = %d body=%s, want %d", rec.Code, rec.Body.String(), http.StatusMethodNotAllowed)
	}
	if rec.Header().Get("Allow") != http.MethodGet {
		t.Fatalf("allow = %q, want %q", rec.Header().Get("Allow"), http.MethodGet)
	}
}
