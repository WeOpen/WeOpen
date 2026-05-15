package settings

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"
)

func TestStoreSavesAndLoadsNormalizedRemoteAPISettings(t *testing.T) {
	t.Parallel()

	store := NewStore(filepath.Join(t.TempDir(), "remote-api.json"))

	saved, err := store.Save(context.Background(), RemoteAPISettings{
		BaseURL:      " https://api.weopen.local/ ",
		SessionToken: " session-token ",
	})
	if err != nil {
		t.Fatalf("save remote API settings: %v", err)
	}

	if saved.BaseURL != "https://api.weopen.local" {
		t.Fatalf("expected normalized base URL, got %q", saved.BaseURL)
	}
	if saved.SessionToken != "session-token" {
		t.Fatalf("expected trimmed session token, got %q", saved.SessionToken)
	}
	if saved.UpdatedAt.IsZero() {
		t.Fatal("expected UpdatedAt to be set")
	}

	loaded, err := store.Load(context.Background())
	if err != nil {
		t.Fatalf("load remote API settings: %v", err)
	}
	if loaded.BaseURL != saved.BaseURL || loaded.SessionToken != saved.SessionToken {
		t.Fatalf("expected loaded settings to match saved settings, got %#v", loaded)
	}
}

func TestStoreRejectsUnsupportedRemoteAPIURL(t *testing.T) {
	t.Parallel()

	store := NewStore(filepath.Join(t.TempDir(), "remote-api.json"))

	if _, err := store.Save(context.Background(), RemoteAPISettings{BaseURL: "ftp://api.weopen.local"}); err == nil {
		t.Fatal("expected unsupported URL scheme to be rejected")
	}
}

func TestStoreTestsHealthzConnectionWithBearerToken(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/healthz" {
			t.Fatalf("expected /healthz, got %s", r.URL.Path)
		}
		if got := r.Header.Get("Authorization"); got != "Bearer session-token" {
			t.Fatalf("expected bearer token, got %q", got)
		}

		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(healthPayload{
			Status:  "ok",
			Service: "weopen-api",
			Version: "0.1.0",
		}); err != nil {
			t.Fatalf("encode health response: %v", err)
		}
	}))
	defer server.Close()

	store := NewStore(filepath.Join(t.TempDir(), "remote-api.json"))
	status, err := store.TestConnection(context.Background(), RemoteAPISettings{
		BaseURL:      server.URL + "/",
		SessionToken: "session-token",
	})
	if err != nil {
		t.Fatalf("test connection: %v", err)
	}

	if !status.OK {
		t.Fatalf("expected OK connection, got %#v", status)
	}
	if status.Status != "ok" || status.Service != "weopen-api" || status.Version != "0.1.0" {
		t.Fatalf("unexpected health payload: %#v", status)
	}
	if status.CheckedAt.IsZero() {
		t.Fatal("expected CheckedAt to be set")
	}
}

func TestStoreReportsMissingRemoteAPIURLAsUnconfigured(t *testing.T) {
	t.Parallel()

	store := NewStore(filepath.Join(t.TempDir(), "remote-api.json"))
	status, err := store.TestConnection(context.Background(), RemoteAPISettings{})
	if err != nil {
		t.Fatalf("missing base URL should be a connection status, not a hard error: %v", err)
	}
	if status.OK {
		t.Fatalf("expected missing base URL to be not OK, got %#v", status)
	}
	if status.Error == "" {
		t.Fatalf("expected missing base URL error message, got %#v", status)
	}
}
