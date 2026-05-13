package http

import (
	"encoding/json"
	"errors"
	stdhttp "net/http"
	"strings"
	"time"

	"github.com/WeOpen/WeOpen/services/api/internal/auth"
)

type authHandlers struct {
	service *auth.Service
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginResponse struct {
	User      auth.User `json:"user"`
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expiresAt"`
}

type meResponse struct {
	User auth.User `json:"user"`
}

func (h authHandlers) login(w stdhttp.ResponseWriter, r *stdhttp.Request) {
	if r.Method != stdhttp.MethodPost {
		w.Header().Set("Allow", stdhttp.MethodPost)
		WriteError(w, r, NewAppError(stdhttp.StatusMethodNotAllowed, ErrorCodeMethodNotAllowed, "请求方法不允许"))
		return
	}

	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, r, NewAppError(stdhttp.StatusBadRequest, ErrorCodeValidationFailed, "请求 JSON 无效"))
		return
	}

	result, err := h.service.Login(r.Context(), req.Email, req.Password)
	if err != nil {
		if errors.Is(err, auth.ErrInvalidCredentials) {
			WriteError(w, r, NewAppError(stdhttp.StatusUnauthorized, "AUTH_INVALID_CREDENTIALS", "邮箱或密码错误"))
			return
		}
		WriteError(w, r, err)
		return
	}

	setSessionCookie(w, result.Token, result.ExpiresAt)
	WriteJSON(w, stdhttp.StatusOK, loginResponse{
		User:      result.User,
		Token:     result.Token,
		ExpiresAt: result.ExpiresAt,
	})
}

func (h authHandlers) logout(w stdhttp.ResponseWriter, r *stdhttp.Request) {
	if r.Method != stdhttp.MethodPost {
		w.Header().Set("Allow", stdhttp.MethodPost)
		WriteError(w, r, NewAppError(stdhttp.StatusMethodNotAllowed, ErrorCodeMethodNotAllowed, "请求方法不允许"))
		return
	}

	_ = h.service.Logout(r.Context(), bearerOrCookieToken(r))
	clearSessionCookie(w)
	WriteJSON(w, stdhttp.StatusOK, map[string]string{"status": "ok"})
}

func (h authHandlers) me(w stdhttp.ResponseWriter, r *stdhttp.Request) {
	if r.Method != stdhttp.MethodGet {
		w.Header().Set("Allow", stdhttp.MethodGet)
		WriteError(w, r, NewAppError(stdhttp.StatusMethodNotAllowed, ErrorCodeMethodNotAllowed, "请求方法不允许"))
		return
	}

	user, err := h.service.UserForToken(r.Context(), bearerOrCookieToken(r))
	if err != nil {
		WriteError(w, r, NewAppError(stdhttp.StatusUnauthorized, "AUTH_SESSION_EXPIRED", "请重新登录"))
		return
	}

	WriteJSON(w, stdhttp.StatusOK, meResponse{User: user})
}

func bearerOrCookieToken(r *stdhttp.Request) string {
	authHeader := r.Header.Get("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		return strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
	}
	cookie, err := r.Cookie(auth.SessionCookieName)
	if err != nil {
		return ""
	}
	return cookie.Value
}

func setSessionCookie(w stdhttp.ResponseWriter, token string, expiresAt time.Time) {
	stdhttp.SetCookie(w, &stdhttp.Cookie{
		Name:     auth.SessionCookieName,
		Value:    token,
		Path:     "/",
		Expires:  expiresAt,
		HttpOnly: true,
		SameSite: stdhttp.SameSiteLaxMode,
	})
}

func clearSessionCookie(w stdhttp.ResponseWriter) {
	stdhttp.SetCookie(w, &stdhttp.Cookie{
		Name:     auth.SessionCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		SameSite: stdhttp.SameSiteLaxMode,
	})
}
