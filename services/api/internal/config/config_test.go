package config

import (
	"strings"
	"testing"
)

func TestLoadFromLookupUsesLocalDefaults(t *testing.T) {
	t.Parallel()

	cfg, err := LoadFromLookup(func(string) (string, bool) {
		return "", false
	})
	if err != nil {
		t.Fatalf("expected local config to load: %v", err)
	}

	if cfg.AppEnv != "local" {
		t.Fatalf("expected local env, got %q", cfg.AppEnv)
	}
	if cfg.Addr != ":8080" {
		t.Fatalf("expected default addr, got %q", cfg.Addr)
	}
	if cfg.SessionSecret == "" {
		t.Fatal("expected local session secret default")
	}
	if cfg.SecretEncryptionKey == "" {
		t.Fatal("expected local encryption key default")
	}
}

func TestLoadFromLookupRequiresProductionSecrets(t *testing.T) {
	t.Parallel()

	cfg, err := LoadFromLookup(func(key string) (string, bool) {
		if key == "APP_ENV" {
			return "production", true
		}
		return "", false
	})
	if err == nil {
		t.Fatalf("expected missing configuration error, got config: %+v", cfg)
	}

	message := err.Error()
	for _, required := range []string{"DATABASE_URL", "SESSION_SECRET", "SECRET_ENCRYPTION_KEY"} {
		if !strings.Contains(message, required) {
			t.Fatalf("expected error to mention %s, got %q", required, message)
		}
	}
}

func TestLoadFromLookupReadsExplicitValues(t *testing.T) {
	t.Parallel()

	values := map[string]string{
		"API_ADDR":              ":9090",
		"APP_ENV":               "preview",
		"APP_URL":               "https://api.example.com",
		"WEB_ORIGIN":            "https://app.example.com",
		"DATABASE_URL":          "postgres://example",
		"SESSION_SECRET":        "session-secret",
		"SECRET_ENCRYPTION_KEY": "encryption-secret",
	}

	cfg, err := LoadFromLookup(func(key string) (string, bool) {
		value, ok := values[key]
		return value, ok
	})
	if err != nil {
		t.Fatalf("expected explicit config to load: %v", err)
	}

	if cfg.Addr != ":9090" {
		t.Fatalf("expected addr from env, got %q", cfg.Addr)
	}
	if !cfg.IsProductionLike() {
		t.Fatal("expected preview config to be production-like")
	}
}
