package http

import "net/http"

import "github.com/WeOpen/WeOpen/services/api/internal/auth"
import "github.com/WeOpen/WeOpen/services/api/internal/audit"
import "github.com/WeOpen/WeOpen/services/api/internal/secrets"

type ServerOptions struct {
	WebOrigin string
	Auth      *auth.Service
	Secrets   *secrets.Service
	Audit     *audit.Service
}

func NewServer(options ...ServerOptions) http.Handler {
	opts := ServerOptions{}
	if len(options) > 0 {
		opts = options[0]
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", healthHandler)
	if opts.Auth != nil {
		authHandlers := authHandlers{service: opts.Auth}
		mux.HandleFunc("/api/auth/login", authHandlers.login)
		mux.HandleFunc("/api/auth/logout", authHandlers.logout)
		mux.HandleFunc("/api/me", authHandlers.me)
	}
	if opts.Auth != nil && opts.Secrets != nil && opts.Audit != nil {
		settingsHandlers := settingsHandlers{
			auth:    opts.Auth,
			secrets: opts.Secrets,
			audit:   opts.Audit,
		}
		mux.HandleFunc("/api/settings", settingsHandlers.settings)
		mux.HandleFunc("/api/audit-logs", settingsHandlers.auditLogs)
	}
	return Chain(mux, WithRequestID, WithRecovery, WithCORS(opts.WebOrigin))
}
