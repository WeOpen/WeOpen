package http

import (
	"crypto/rand"
	"crypto/subtle"
	"encoding/hex"
	stdhttp "net/http"
	"strings"
	"time"
)

const (
	csrfCookieName = "weopen_csrf"
	csrfHeaderName = "X-CSRF-Token"
)

// WithCSRF protects cookie-authenticated unsafe API requests with a double-submit token.
func WithCSRF(next stdhttp.Handler) stdhttp.Handler {
	return stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, r *stdhttp.Request) {
		if shouldValidateCSRF(r) && !validCSRF(r) {
			WriteError(w, r, NewAppError(stdhttp.StatusForbidden, "CSRF_TOKEN_INVALID", "安全校验失败，请刷新页面后重试"))
			return
		}
		next.ServeHTTP(w, r)
	})
}

func shouldValidateCSRF(r *stdhttp.Request) bool {
	if !isUnsafeMethod(r.Method) {
		return false
	}
	if !strings.HasPrefix(r.URL.Path, "/api/") {
		return false
	}
	if r.URL.Path == "/api/auth/login" || r.URL.Path == "/api/auth/csrf" {
		return false
	}
	if strings.HasPrefix(r.Header.Get("Authorization"), "Bearer ") {
		return false
	}
	_, err := r.Cookie("weopen_session")
	return err == nil
}

func isUnsafeMethod(method string) bool {
	return method == stdhttp.MethodPost || method == stdhttp.MethodPatch || method == stdhttp.MethodPut || method == stdhttp.MethodDelete
}

func validCSRF(r *stdhttp.Request) bool {
	cookie, err := r.Cookie(csrfCookieName)
	if err != nil || cookie.Value == "" {
		return false
	}
	header := strings.TrimSpace(r.Header.Get(csrfHeaderName))
	if header == "" {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(cookie.Value), []byte(header)) == 1
}

func newCSRFToken() string {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return hex.EncodeToString([]byte(time.Now().UTC().Format(time.RFC3339Nano)))
	}
	return hex.EncodeToString(bytes)
}

func setCSRFCookie(w stdhttp.ResponseWriter, token string, expiresAt time.Time, secure bool) {
	stdhttp.SetCookie(w, &stdhttp.Cookie{
		Name:     csrfCookieName,
		Value:    token,
		Path:     "/",
		Expires:  expiresAt,
		HttpOnly: false,
		Secure:   secure,
		SameSite: stdhttp.SameSiteLaxMode,
	})
}

func clearCSRFCookie(w stdhttp.ResponseWriter, secure bool) {
	stdhttp.SetCookie(w, &stdhttp.Cookie{
		Name:     csrfCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: false,
		Secure:   secure,
		SameSite: stdhttp.SameSiteLaxMode,
	})
}
