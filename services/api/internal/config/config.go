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
	}

	if cfg.AppEnv == "local" {
		if cfg.SessionSecret == "" {
			cfg.SessionSecret = "local-session-secret"
		}
		if cfg.SecretEncryptionKey == "" {
			cfg.SecretEncryptionKey = "local-secret-encryption-key"
		}
		return cfg, nil
	}

	var missing []string
	for name, value := range map[string]string{
		"DATABASE_URL":          cfg.DatabaseURL,
		"SESSION_SECRET":        cfg.SessionSecret,
		"SECRET_ENCRYPTION_KEY": cfg.SecretEncryptionKey,
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
