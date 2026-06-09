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
	if cfg.R2Bucket != "weopen-local" {
		t.Fatalf("expected local R2 bucket default, got %q", cfg.R2Bucket)
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
	for _, required := range []string{"DATABASE_URL", "SESSION_SECRET", "SECRET_ENCRYPTION_KEY", "ADMIN_PASSWORD", "R2_ACCOUNT_ID", "R2_BUCKET", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"} {
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
		"MIGRATIONS_DIR":        "custom/migrations",
		"SESSION_SECRET":        "session-secret",
		"SECRET_ENCRYPTION_KEY": "encryption-secret",
		"ADMIN_EMAIL":           "owner@example.com",
		"ADMIN_PASSWORD":        "correct horse battery staple",
		"R2_ACCOUNT_ID":         "account",
		"R2_BUCKET":             "bucket",
		"R2_ACCESS_KEY_ID":      "r2-access",
		"R2_SECRET_ACCESS_KEY":  "r2-secret",
		"CLOUDFLARE_API_TOKEN":  "cf-token",
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
	if cfg.AdminEmail != "owner@example.com" {
		t.Fatalf("expected admin email, got %q", cfg.AdminEmail)
	}
	if cfg.MigrationsDir != "custom/migrations" {
		t.Fatalf("expected migrations dir, got %q", cfg.MigrationsDir)
	}
	if cfg.R2Bucket != "bucket" {
		t.Fatalf("expected R2 bucket, got %q", cfg.R2Bucket)
	}
	if cfg.CloudflareAPIToken != "cf-token" {
		t.Fatalf("expected Cloudflare API token, got %q", cfg.CloudflareAPIToken)
	}
}

func TestLoadFromLookupRejectsProductionDefaultAdminPassword(t *testing.T) {
	t.Parallel()

	values := map[string]string{
		"APP_ENV":               "production",
		"DATABASE_URL":          "postgres://example",
		"SESSION_SECRET":        "real-session-secret",
		"SECRET_ENCRYPTION_KEY": "real-encryption-secret",
		"ADMIN_EMAIL":           "owner@example.com",
		"ADMIN_PASSWORD":        "admin",
		"R2_ACCOUNT_ID":         "account",
		"R2_BUCKET":             "bucket",
		"R2_ACCESS_KEY_ID":      "r2-access",
		"R2_SECRET_ACCESS_KEY":  "r2-secret",
	}

	_, err := LoadFromLookup(func(key string) (string, bool) {
		value, ok := values[key]
		return value, ok
	})
	if err == nil || !strings.Contains(err.Error(), "ADMIN_PASSWORD must be changed") {
		t.Fatalf("expected production admin password rejection, got %v", err)
	}
}
