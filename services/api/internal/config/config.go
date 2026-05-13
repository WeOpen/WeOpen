package config

import (
	"errors"
	"fmt"
	"os"
	"strings"
)

type Config struct {
	Addr                string
	AppEnv              string
	AppURL              string
	WebOrigin           string
	DatabaseURL         string
	SessionSecret       string
	SecretEncryptionKey string
	AdminEmail          string
	AdminPassword       string
	R2AccountID         string
	R2Bucket            string
	R2AccessKeyID       string
	R2SecretAccessKey   string
}

func Load() (Config, error) {
	return LoadFromLookup(os.LookupEnv)
}

func LoadFromLookup(lookup func(string) (string, bool)) (Config, error) {
	cfg := Config{
		Addr:                valueOrDefault(lookup, "API_ADDR", ":8080"),
		AppEnv:              valueOrDefault(lookup, "APP_ENV", "local"),
		AppURL:              valueOrDefault(lookup, "APP_URL", "http://localhost:8080"),
		WebOrigin:           valueOrDefault(lookup, "WEB_ORIGIN", "http://localhost:3000"),
		DatabaseURL:         valueOrDefault(lookup, "DATABASE_URL", ""),
		SessionSecret:       valueOrDefault(lookup, "SESSION_SECRET", ""),
		SecretEncryptionKey: valueOrDefault(lookup, "SECRET_ENCRYPTION_KEY", ""),
		AdminEmail:          valueOrDefault(lookup, "ADMIN_EMAIL", "admin@example.com"),
		AdminPassword:       valueOrDefault(lookup, "ADMIN_PASSWORD", ""),
		R2AccountID:         valueOrDefault(lookup, "R2_ACCOUNT_ID", ""),
		R2Bucket:            valueOrDefault(lookup, "R2_BUCKET", ""),
		R2AccessKeyID:       valueOrDefault(lookup, "R2_ACCESS_KEY_ID", ""),
		R2SecretAccessKey:   valueOrDefault(lookup, "R2_SECRET_ACCESS_KEY", ""),
	}

	if cfg.AppEnv == "local" {
		if cfg.SessionSecret == "" {
			cfg.SessionSecret = "local-session-secret"
		}
		if cfg.SecretEncryptionKey == "" {
			cfg.SecretEncryptionKey = "local-secret-encryption-key"
		}
		if cfg.AdminPassword == "" {
			cfg.AdminPassword = "admin"
		}
		if cfg.R2AccountID == "" {
			cfg.R2AccountID = "local-account"
		}
		if cfg.R2Bucket == "" {
			cfg.R2Bucket = "weopen-local"
		}
		if cfg.R2AccessKeyID == "" {
			cfg.R2AccessKeyID = "local-r2-access"
		}
		if cfg.R2SecretAccessKey == "" {
			cfg.R2SecretAccessKey = "local-r2-secret"
		}
		return cfg, nil
	}

	var missing []string
	for name, value := range map[string]string{
		"DATABASE_URL":          cfg.DatabaseURL,
		"SESSION_SECRET":        cfg.SessionSecret,
		"SECRET_ENCRYPTION_KEY": cfg.SecretEncryptionKey,
		"ADMIN_EMAIL":           cfg.AdminEmail,
		"ADMIN_PASSWORD":        cfg.AdminPassword,
		"R2_ACCOUNT_ID":         cfg.R2AccountID,
		"R2_BUCKET":             cfg.R2Bucket,
		"R2_ACCESS_KEY_ID":      cfg.R2AccessKeyID,
		"R2_SECRET_ACCESS_KEY":  cfg.R2SecretAccessKey,
	} {
		if value == "" {
			missing = append(missing, name)
		}
	}

	if len(missing) > 0 {
		return Config{}, fmt.Errorf("missing required configuration: %s", strings.Join(missing, ", "))
	}

	return cfg, nil
}

func (c Config) IsProductionLike() bool {
	return c.AppEnv != "" && c.AppEnv != "local" && c.AppEnv != "development"
}

func valueOrDefault(lookup func(string) (string, bool), key string, fallback string) string {
	value, ok := lookup(key)
	if !ok {
		return fallback
	}
	value = strings.TrimSpace(value)
	if value == "" {
		return fallback
	}
	return value
}

func RequireConfig(cfg Config) error {
	if cfg.Addr == "" {
		return errors.New("API_ADDR cannot be empty")
	}
	if cfg.AppEnv == "" {
		return errors.New("APP_ENV cannot be empty")
	}
	if cfg.AppURL == "" {
		return errors.New("APP_URL cannot be empty")
	}
	if cfg.WebOrigin == "" {
		return errors.New("WEB_ORIGIN cannot be empty")
	}
	return nil
}
