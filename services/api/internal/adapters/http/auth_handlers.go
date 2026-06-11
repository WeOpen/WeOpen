package http

import (
	"encoding/json"
	"errors"
	"net"
	stdhttp "net/http"
	"strings"
	"time"

	"github.com/WeOpen/WeOpen/services/api/internal/domain/audit"
	"github.com/WeOpen/WeOpen/services/api/internal/domain/auth"
)

type authHandlers struct {
	service       *auth.Service
	audit         *audit.Service
	loginLimiter  *loginRateLimiter
	secureCookies bool
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	TOTPCode string `json:"totpCode"`
}

type changePasswordRequest struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

type mfaPasswordRequest struct {
	CurrentPassword string `json:"currentPassword"`
}

type mfaVerifyRequest struct {
	Code string `json:"code"`
}

type loginResponse struct {
	User      auth.User `json:"user"`
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
	limitKey := loginLimitKey(r, req.Email)
	if !h.loginLimiter.Allow(r.Context(), limitKey) {
		h.recordLoginAudit(r, "auth.login_rate_limited", "", req.Email, "rate_limited")
		WriteError(w, r, NewAppError(stdhttp.StatusTooManyRequests, "AUTH_RATE_LIMITED", "登录尝试过多，请稍后再试"))
		return
	}

	result, err := h.service.LoginWithTOTP(r.Context(), req.Email, req.Password, req.TOTPCode)
	if err != nil {
		if errors.Is(err, auth.ErrInvalidCredentials) {
			h.loginLimiter.RecordFailure(r.Context(), limitKey)
			h.recordLoginAudit(r, "auth.login_failed", "", req.Email, "invalid_credentials")
			WriteError(w, r, NewAppError(stdhttp.StatusUnauthorized, "AUTH_INVALID_CREDENTIALS", "邮箱或密码错误"))
			return
		}
		if errors.Is(err, auth.ErrUserDisabled) {
			h.recordLoginAudit(r, "auth.login_failed", "", req.Email, "user_disabled")
			WriteError(w, r, NewAppError(stdhttp.StatusForbidden, "AUTH_USER_DISABLED", "账号已停用"))
			return
		}
		if errors.Is(err, auth.ErrMFACodeRequired) {
			h.recordLoginAudit(r, "auth.login_mfa_required", "", req.Email, "mfa_required")
			WriteError(w, r, NewAppError(stdhttp.StatusUnauthorized, "AUTH_MFA_REQUIRED", "请输入双因素验证码"))
			return
		}
		if errors.Is(err, auth.ErrInvalidMFACode) {
			h.loginLimiter.RecordFailure(r.Context(), limitKey)
			h.recordLoginAudit(r, "auth.login_failed", "", req.Email, "invalid_mfa_code")
			WriteError(w, r, NewAppError(stdhttp.StatusUnauthorized, "AUTH_INVALID_MFA_CODE", "双因素验证码无效"))
			return
		}
		h.loginLimiter.RecordFailure(r.Context(), limitKey)
		h.recordLoginAudit(r, "auth.login_failed", "", req.Email, "internal_error")
		WriteError(w, r, err)
		return
	}
	h.loginLimiter.Reset(r.Context(), limitKey)
	h.recordLoginAudit(r, "auth.login_succeeded", result.User.ID, result.User.Email, "")

	setSessionCookie(w, result.Token, result.ExpiresAt, h.secureCookies)
	setCSRFCookie(w, newCSRFToken(), result.ExpiresAt, h.secureCookies)
	WriteJSON(w, stdhttp.StatusOK, loginResponse{
		User:      result.User,
		ExpiresAt: result.ExpiresAt,
	})
}

func (h authHandlers) mfaEnroll(w stdhttp.ResponseWriter, r *stdhttp.Request) {
	if r.Method != stdhttp.MethodPost {
		w.Header().Set("Allow", stdhttp.MethodPost)
		WriteError(w, r, NewAppError(stdhttp.StatusMethodNotAllowed, ErrorCodeMethodNotAllowed, "请求方法不允许"))
		return
	}
	user, ok := h.requireCurrentUser(w, r)
	if !ok {
		return
	}
	var req mfaPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, r, NewAppError(stdhttp.StatusBadRequest, ErrorCodeValidationFailed, "请求 JSON 无效"))
		return
	}
	enrollment, err := h.service.BeginMFAEnrollment(r.Context(), user.ID, req.CurrentPassword, "WeOpen")
	if err != nil {
		h.writeCredentialOrMFAError(w, r, err)
		return
	}
	WriteJSON(w, stdhttp.StatusOK, enrollment)
}

func (h authHandlers) mfaVerify(w stdhttp.ResponseWriter, r *stdhttp.Request) {
	if r.Method != stdhttp.MethodPost {
		w.Header().Set("Allow", stdhttp.MethodPost)
		WriteError(w, r, NewAppError(stdhttp.StatusMethodNotAllowed, ErrorCodeMethodNotAllowed, "请求方法不允许"))
		return
	}
	user, ok := h.requireCurrentUser(w, r)
	if !ok {
		return
	}
	var req mfaVerifyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, r, NewAppError(stdhttp.StatusBadRequest, ErrorCodeValidationFailed, "请求 JSON 无效"))
		return
	}
	if err := h.service.VerifyMFAEnrollment(r.Context(), user.ID, req.Code); err != nil {
		h.writeCredentialOrMFAError(w, r, err)
		return
	}
	h.recordLoginAudit(r, "auth.mfa_enabled", user.ID, user.Email, "")
	WriteJSON(w, stdhttp.StatusOK, map[string]string{"status": "ok"})
}

func (h authHandlers) mfaDisable(w stdhttp.ResponseWriter, r *stdhttp.Request) {
	if r.Method != stdhttp.MethodDelete {
		w.Header().Set("Allow", stdhttp.MethodDelete)
		WriteError(w, r, NewAppError(stdhttp.StatusMethodNotAllowed, ErrorCodeMethodNotAllowed, "请求方法不允许"))
		return
	}
	user, ok := h.requireCurrentUser(w, r)
	if !ok {
		return
	}
	var req mfaPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, r, NewAppError(stdhttp.StatusBadRequest, ErrorCodeValidationFailed, "请求 JSON 无效"))
		return
	}
	if err := h.service.DisableMFA(r.Context(), user.ID, req.CurrentPassword); err != nil {
		h.writeCredentialOrMFAError(w, r, err)
		return
	}
	h.recordLoginAudit(r, "auth.mfa_disabled", user.ID, user.Email, "")
	WriteJSON(w, stdhttp.StatusOK, map[string]string{"status": "ok"})
}

func (h authHandlers) requireCurrentUser(w stdhttp.ResponseWriter, r *stdhttp.Request) (auth.User, bool) {
	user, err := h.service.UserForToken(r.Context(), bearerOrCookieToken(r))
	if err != nil {
		writeAuthSessionError(w, r, err)
		return auth.User{}, false
	}
	return user, true
}

func (h authHandlers) writeCredentialOrMFAError(w stdhttp.ResponseWriter, r *stdhttp.Request, err error) {
	if errors.Is(err, auth.ErrInvalidCredentials) {
		WriteError(w, r, NewAppError(stdhttp.StatusUnauthorized, "AUTH_INVALID_CREDENTIALS", "当前密码不正确"))
		return
	}
	if errors.Is(err, auth.ErrInvalidMFACode) {
		WriteError(w, r, NewAppError(stdhttp.StatusBadRequest, "AUTH_INVALID_MFA_CODE", "双因素验证码无效"))
		return
	}
	WriteError(w, r, err)
}

func (h authHandlers) logout(w stdhttp.ResponseWriter, r *stdhttp.Request) {
	if r.Method != stdhttp.MethodPost {
		w.Header().Set("Allow", stdhttp.MethodPost)
		WriteError(w, r, NewAppError(stdhttp.StatusMethodNotAllowed, ErrorCodeMethodNotAllowed, "请求方法不允许"))
		return
	}

	_ = h.service.Logout(r.Context(), bearerOrCookieToken(r))
	clearSessionCookie(w, h.secureCookies)
	clearCSRFCookie(w, h.secureCookies)
	WriteJSON(w, stdhttp.StatusOK, map[string]string{"status": "ok"})
}

func (h authHandlers) csrf(w stdhttp.ResponseWriter, r *stdhttp.Request) {
	if r.Method != stdhttp.MethodGet {
		w.Header().Set("Allow", stdhttp.MethodGet)
		WriteError(w, r, NewAppError(stdhttp.StatusMethodNotAllowed, ErrorCodeMethodNotAllowed, "请求方法不允许"))
		return
	}
	expiresAt := time.Now().Add(24 * time.Hour)
	token := newCSRFToken()
	setCSRFCookie(w, token, expiresAt, h.secureCookies)
	WriteJSON(w, stdhttp.StatusOK, map[string]string{"token": token})
}

func (h authHandlers) changePassword(w stdhttp.ResponseWriter, r *stdhttp.Request) {
	if r.Method != stdhttp.MethodPost {
		w.Header().Set("Allow", stdhttp.MethodPost)
		WriteError(w, r, NewAppError(stdhttp.StatusMethodNotAllowed, ErrorCodeMethodNotAllowed, "请求方法不允许"))
		return
	}
	user, err := h.service.UserForToken(r.Context(), bearerOrCookieToken(r))
	if err != nil {
		writeAuthSessionError(w, r, err)
		return
	}
	var req changePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, r, NewAppError(stdhttp.StatusBadRequest, ErrorCodeValidationFailed, "请求 JSON 无效"))
		return
	}
	if err := h.service.ChangePassword(r.Context(), user.ID, req.CurrentPassword, req.NewPassword, bearerOrCookieToken(r)); err != nil {
		if errors.Is(err, auth.ErrInvalidCredentials) {
			WriteError(w, r, NewAppError(stdhttp.StatusUnauthorized, "AUTH_INVALID_CREDENTIALS", "当前密码不正确"))
			return
		}
		if errors.Is(err, auth.ErrInvalidPasswordPolicy) {
			WriteError(w, r, NewAppError(stdhttp.StatusBadRequest, "AUTH_WEAK_PASSWORD", "新密码至少 12 位，并包含大小写字母、数字和符号"))
			return
		}
		WriteError(w, r, err)
		return
	}
	h.recordLoginAudit(r, "auth.password_changed", user.ID, user.Email, "")
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
		writeAuthSessionError(w, r, err)
		return
	}

	WriteJSON(w, stdhttp.StatusOK, meResponse{User: user})
}

func writeAuthSessionError(w stdhttp.ResponseWriter, r *stdhttp.Request, err error) {
	if errors.Is(err, auth.ErrUserDisabled) {
		WriteError(w, r, NewAppError(stdhttp.StatusForbidden, "AUTH_USER_DISABLED", "账号已停用"))
		return
	}
	WriteError(w, r, NewAppError(stdhttp.StatusUnauthorized, "AUTH_SESSION_EXPIRED", "请重新登录"))
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

func setSessionCookie(w stdhttp.ResponseWriter, token string, expiresAt time.Time, secure bool) {
	stdhttp.SetCookie(w, &stdhttp.Cookie{
		Name:     auth.SessionCookieName,
		Value:    token,
		Path:     "/",
		Expires:  expiresAt,
		HttpOnly: true,
		Secure:   secure,
		SameSite: stdhttp.SameSiteLaxMode,
	})
}

func clearSessionCookie(w stdhttp.ResponseWriter, secure bool) {
	stdhttp.SetCookie(w, &stdhttp.Cookie{
		Name:     auth.SessionCookieName,
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   secure,
		SameSite: stdhttp.SameSiteLaxMode,
	})
}

func (h authHandlers) recordLoginAudit(r *stdhttp.Request, action string, actorUserID string, email string, reason string) {
	if h.audit == nil {
		return
	}
	metadata := map[string]any{
		"email":         strings.ToLower(strings.TrimSpace(email)),
		"remoteAddress": remoteAddress(r),
	}
	if userAgent := strings.TrimSpace(r.UserAgent()); userAgent != "" {
		metadata["userAgent"] = userAgent
	}
	if reason != "" {
		metadata["reason"] = reason
	}
	_, _ = h.audit.Record(r.Context(), audit.Entry{
		ActorUserID: actorUserID,
		Action:      action,
		TargetType:  "auth_session",
		TargetID:    actorUserID,
		Metadata:    metadata,
	})
}

func loginLimitKey(r *stdhttp.Request, email string) string {
	return remoteAddress(r) + "|" + strings.ToLower(strings.TrimSpace(email))
}

func remoteAddress(r *stdhttp.Request) string {
	forwardedFor := strings.TrimSpace(r.Header.Get("X-Forwarded-For"))
	if forwardedFor != "" {
		first, _, _ := strings.Cut(forwardedFor, ",")
		return strings.TrimSpace(first)
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil && host != "" {
		return host
	}
	return strings.TrimSpace(r.RemoteAddr)
}
