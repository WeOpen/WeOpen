package http

import "net/http"

func NewServer() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", healthHandler)
	return mux
}
