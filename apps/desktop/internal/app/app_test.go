package app

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"path/filepath"
	"testing"

	"github.com/WeOpen/WeOpen/apps/desktop/internal/settings"
)

func TestAppHealthReturnsDesktopStatus(t *testing.T) {
	t.Parallel()

	app := NewApp("0.1.0")
	health := app.Health()

	if health.Status != "ok" {
		t.Fatalf("expected status ok, got %q", health.Status)
	}

	if health.Service != "weopen-desktop" {
		t.Fatalf("expected desktop service, got %q", health.Service)
	}

	if health.Version != "0.1.0" {
		t.Fatalf("expected version 0.1.0, got %q", health.Version)
	}
}

func TestAppExposesRemoteAPISettings(t *testing.T) {
	t.Parallel()

	store := settings.NewStore(filepath.Join(t.TempDir(), "remote-api.json"))
	app := NewAppWithSettings("0.1.0", store)

	saved, err := app.SaveRemoteAPISettings(context.Background(), settings.RemoteAPISettings{
		BaseURL:      "https://api.weopen.local/",
		SessionToken: "session-token",
	})
	if err != nil {
		t.Fatalf("save settings through app: %v", err)
	}
	if saved.BaseURL != "https://api.weopen.local" {
		t.Fatalf("expected app to normalize settings, got %#v", saved)
	}

	loaded, err := app.LoadRemoteAPISettings(context.Background())
	if err != nil {
		t.Fatalf("load settings through app: %v", err)
	}
	if loaded.BaseURL != saved.BaseURL || loaded.SessionToken != saved.SessionToken {
		t.Fatalf("expected loaded settings to match saved settings, got %#v", loaded)
	}
}

func TestAppTestsRemoteAPIConnection(t *testing.T) {
	t.Parallel()

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/healthz" {
			t.Fatalf("expected /healthz, got %s", r.URL.Path)
		}
		w.Header().Set("Content-Type", "application/json")
		if err := json.NewEncoder(w).Encode(map[string]string{
			"status":  "ok",
			"service": "weopen-api",
			"version": "0.1.0",
		}); err != nil {
			t.Fatalf("encode health response: %v", err)
		}
	}))
	defer server.Close()

	app := NewAppWithSettings("0.1.0", settings.NewStore(filepath.Join(t.TempDir(), "remote-api.json")))
	status, err := app.TestRemoteAPIConnection(context.Background(), settings.RemoteAPISettings{BaseURL: server.URL})
	if err != nil {
		t.Fatalf("test connection through app: %v", err)
	}
	if !status.OK || status.Service != "weopen-api" {
		t.Fatalf("expected healthy remote API status, got %#v", status)
	}
}
