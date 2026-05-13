package http

import "net/http"

type ServerOptions struct {
	WebOrigin string
}

func NewServer(options ...ServerOptions) http.Handler {
	opts := ServerOptions{}
	if len(options) > 0 {
		opts = options[0]
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", healthHandler)
	return Chain(mux, WithRequestID, WithRecovery, WithCORS(opts.WebOrigin))
}
