package http

import "net/http"

import "github.com/WeOpen/WeOpen/services/api/internal/auth"

type ServerOptions struct {
	WebOrigin string
	Auth      *auth.Service
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
	return Chain(mux, WithRequestID, WithRecovery, WithCORS(opts.WebOrigin))
}
