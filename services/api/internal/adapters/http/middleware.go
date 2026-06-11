package http

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"log"
	stdhttp "net/http"
)

type contextKey string

const requestIDContextKey contextKey = "request-id"

// Middleware wraps an HTTP handler with cross-cutting API behavior.
type Middleware func(stdhttp.Handler) stdhttp.Handler

// Chain applies middleware in declaration order.
func Chain(handler stdhttp.Handler, middlewares ...Middleware) stdhttp.Handler {
	for i := len(middlewares) - 1; i >= 0; i-- {
		handler = middlewares[i](handler)
	}
	return handler
}

// WithRequestID propagates or creates a request ID for responses and error bodies.
func WithRequestID(next stdhttp.Handler) stdhttp.Handler {
	return stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, r *stdhttp.Request) {
		requestID := r.Header.Get("X-Request-Id")
		if requestID == "" {
			requestID = newRequestID()
		}
		w.Header().Set("X-Request-Id", requestID)
		ctx := context.WithValue(r.Context(), requestIDContextKey, requestID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// WithRecovery converts panics into sanitized API errors while preserving request correlation in logs.
func WithRecovery(next stdhttp.Handler) stdhttp.Handler {
	return stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, r *stdhttp.Request) {
		defer func() {
			if recovered := recover(); recovered != nil {
				log.Printf("panic recovered request_id=%s error=%v", RequestIDFromContext(r.Context()), recovered)
				WriteError(w, r, NewAppError(stdhttp.StatusInternalServerError, ErrorCodeInternal, "服务器内部错误"))
			}
		}()
		next.ServeHTTP(w, r)
	})
}

// WithCORS permits credentialed browser calls only from the configured web origin.
func WithCORS(allowedOrigin string) Middleware {
	return func(next stdhttp.Handler) stdhttp.Handler {
		return stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, r *stdhttp.Request) {
			origin := r.Header.Get("Origin")
			if allowedOrigin != "" && origin == allowedOrigin {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Credentials", "true")
				w.Header().Add("Vary", "Origin")
			}
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-CSRF-Token, X-Request-Id")

			if r.Method == stdhttp.MethodOptions {
				w.WriteHeader(stdhttp.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// RequestIDFromContext returns the request ID attached by WithRequestID.
func RequestIDFromContext(ctx context.Context) string {
	requestID, _ := ctx.Value(requestIDContextKey).(string)
	return requestID
}

func newRequestID() string {
	bytes := make([]byte, 12)
	if _, err := rand.Read(bytes); err != nil {
		return "req_unknown"
	}
	return "req_" + hex.EncodeToString(bytes)
}
