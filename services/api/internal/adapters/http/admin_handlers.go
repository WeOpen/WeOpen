package http

import (
	"encoding/json"
	"errors"
	stdhttp "net/http"
	"strings"
	"time"

	"github.com/WeOpen/WeOpen/platform/core/plugin"
	"github.com/WeOpen/WeOpen/services/api/internal/domain/audit"
	"github.com/WeOpen/WeOpen/services/api/internal/domain/auth"
)

type adminHandlers struct {
	auth  *auth.Service
	audit *audit.Service
}

type usersResponse struct {
	Users []auth.User `json:"users"`
}

type rolesResponse struct {
	Roles []auth.Role `json:"roles"`
}

type sessionsResponse struct {
	Sessions []auth.SessionInfo `json:"sessions"`
}

type createUserRequest struct {
	Email       string   `json:"email"`
	DisplayName string   `json:"displayName"`
	Password    string   `json:"password"`
	Roles       []string `json:"roles"`
}

type updateUserRequest struct {
	DisplayName *string  `json:"displayName"`
	Status      *string  `json:"status"`
	Roles       []string `json:"roles"`
}

func (h adminHandlers) users(w stdhttp.ResponseWriter, r *stdhttp.Request) {
	adminStore, user, ok := h.requireAdminStore(w, r)
	if !ok {
		return
	}

	switch r.Method {
	case stdhttp.MethodGet:
		users, err := adminStore.ListUsers(r.Context())
		if err != nil {
			WriteError(w, r, err)
			return
		}
		WriteJSON(w, stdhttp.StatusOK, usersResponse{Users: users})
	case stdhttp.MethodPost:
		var req createUserRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			WriteError(w, r, NewAppError(stdhttp.StatusBadRequest, ErrorCodeValidationFailed, "请求 JSON 无效"))
			return
		}
		if err := auth.ValidatePasswordPolicy(req.Password); err != nil {
			WriteError(w, r, NewAppError(stdhttp.StatusBadRequest, "AUTH_WEAK_PASSWORD", "密码至少 12 位，并包含大小写字母、数字和符号"))
			return
		}
		passwordHash, err := auth.HashPassword(req.Password)
		if err != nil {
			WriteError(w, r, err)
			return
		}
		now := time.Now()
		newUser, err := adminStore.CreateUser(r.Context(), auth.User{
			Email:              req.Email,
			DisplayName:        strings.TrimSpace(req.DisplayName),
			Status:             auth.UserStatusActive,
			MustChangePassword: true,
			PasswordHash:       passwordHash,
			CreatedAt:          now,
			UpdatedAt:          now,
		}, normalizedRoleNames(req.Roles))
		if err != nil {
			writeAdminStoreError(w, r, err)
			return
		}
		h.recordAdminAudit(r, user, "auth.user_created", "user", newUser.ID, map[string]any{"email": newUser.Email})
		WriteJSON(w, stdhttp.StatusCreated, map[string]auth.User{"user": newUser})
	default:
		w.Header().Set("Allow", "GET, POST")
		WriteError(w, r, NewAppError(stdhttp.StatusMethodNotAllowed, ErrorCodeMethodNotAllowed, "请求方法不允许"))
	}
}

func (h adminHandlers) userByID(w stdhttp.ResponseWriter, r *stdhttp.Request) {
	adminStore, user, ok := h.requireAdminStore(w, r)
	if !ok {
		return
	}
	if r.Method != stdhttp.MethodPatch {
		w.Header().Set("Allow", stdhttp.MethodPatch)
		WriteError(w, r, NewAppError(stdhttp.StatusMethodNotAllowed, ErrorCodeMethodNotAllowed, "请求方法不允许"))
		return
	}
	userID := strings.TrimPrefix(r.URL.Path, "/api/admin/users/")
	if userID == "" || strings.Contains(userID, "/") {
		WriteError(w, r, NewAppError(stdhttp.StatusNotFound, ErrorCodeNotFound, "用户不存在"))
		return
	}
	var req updateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, r, NewAppError(stdhttp.StatusBadRequest, ErrorCodeValidationFailed, "请求 JSON 无效"))
		return
	}
	var roles *[]string
	if req.Roles != nil {
		normalized := normalizedRoleNames(req.Roles)
		roles = &normalized
	}
	updated, err := adminStore.UpdateUser(r.Context(), userID, auth.UserUpdate{
		DisplayName: req.DisplayName,
		Status:      req.Status,
		RoleNames:   roles,
	})
	if err != nil {
		writeAdminStoreError(w, r, err)
		return
	}
	h.recordAdminAudit(r, user, "auth.user_updated", "user", updated.ID, map[string]any{"status": updated.Status, "roles": updated.Roles})
	WriteJSON(w, stdhttp.StatusOK, map[string]auth.User{"user": updated})
}

func (h adminHandlers) roles(w stdhttp.ResponseWriter, r *stdhttp.Request) {
	adminStore, _, ok := h.requireAdminStore(w, r)
	if !ok {
		return
	}
	if r.Method != stdhttp.MethodGet {
		w.Header().Set("Allow", stdhttp.MethodGet)
		WriteError(w, r, NewAppError(stdhttp.StatusMethodNotAllowed, ErrorCodeMethodNotAllowed, "请求方法不允许"))
		return
	}
	roles, err := adminStore.ListRoles(r.Context())
	if err != nil {
		WriteError(w, r, err)
		return
	}
	WriteJSON(w, stdhttp.StatusOK, rolesResponse{Roles: roles})
}

func (h adminHandlers) sessions(w stdhttp.ResponseWriter, r *stdhttp.Request) {
	adminStore, _, ok := h.requireAdminStore(w, r)
	if !ok {
		return
	}
	if r.Method != stdhttp.MethodGet {
		w.Header().Set("Allow", stdhttp.MethodGet)
		WriteError(w, r, NewAppError(stdhttp.StatusMethodNotAllowed, ErrorCodeMethodNotAllowed, "请求方法不允许"))
		return
	}
	userID := strings.TrimSpace(r.URL.Query().Get("userId"))
	sessions, err := adminStore.ListSessions(r.Context(), userID)
	if err != nil {
		WriteError(w, r, err)
		return
	}
	WriteJSON(w, stdhttp.StatusOK, sessionsResponse{Sessions: sessions})
}

func (h adminHandlers) sessionByID(w stdhttp.ResponseWriter, r *stdhttp.Request) {
	adminStore, user, ok := h.requireAdminStore(w, r)
	if !ok {
		return
	}
	if r.Method != stdhttp.MethodDelete {
		w.Header().Set("Allow", stdhttp.MethodDelete)
		WriteError(w, r, NewAppError(stdhttp.StatusMethodNotAllowed, ErrorCodeMethodNotAllowed, "请求方法不允许"))
		return
	}
	sessionID := strings.TrimPrefix(r.URL.Path, "/api/admin/sessions/")
	if sessionID == "" || strings.Contains(sessionID, "/") {
		WriteError(w, r, NewAppError(stdhttp.StatusNotFound, ErrorCodeNotFound, "会话不存在"))
		return
	}
	if err := adminStore.DeleteSessionByID(r.Context(), sessionID); err != nil {
		WriteError(w, r, err)
		return
	}
	h.recordAdminAudit(r, user, "auth.session_revoked", "auth_session", sessionID, nil)
	WriteJSON(w, stdhttp.StatusOK, map[string]string{"status": "ok"})
}

func (h adminHandlers) requireAdminStore(w stdhttp.ResponseWriter, r *stdhttp.Request) (auth.AdminStore, auth.User, bool) {
	user, err := h.auth.UserForToken(r.Context(), bearerOrCookieToken(r))
	if err != nil {
		writeAuthSessionError(w, r, err)
		return nil, auth.User{}, false
	}
	if !hasPermissions(user, []plugin.Permission{plugin.PermissionUserManage}) {
		WriteError(w, r, NewAppError(stdhttp.StatusForbidden, ErrorCodeForbidden, "权限不足"))
		return nil, auth.User{}, false
	}
	adminStore, ok := h.auth.Store().(auth.AdminStore)
	if !ok {
		WriteError(w, r, NewAppError(stdhttp.StatusNotImplemented, "AUTH_STORE_UNSUPPORTED", "当前认证存储不支持用户管理"))
		return nil, auth.User{}, false
	}
	return adminStore, user, true
}

func (h adminHandlers) recordAdminAudit(r *stdhttp.Request, user auth.User, action string, targetType string, targetID string, metadata map[string]any) {
	if h.audit == nil {
		return
	}
	_, _ = h.audit.Record(r.Context(), audit.Entry{
		ActorUserID: user.ID,
		Action:      action,
		TargetType:  targetType,
		TargetID:    targetID,
		Metadata:    metadata,
	})
}

func writeAdminStoreError(w stdhttp.ResponseWriter, r *stdhttp.Request, err error) {
	if errors.Is(err, auth.ErrUserNotFound) || errors.Is(err, auth.ErrRoleNotFound) {
		WriteError(w, r, NewAppError(stdhttp.StatusNotFound, ErrorCodeNotFound, "用户或角色不存在"))
		return
	}
	if errors.Is(err, auth.ErrInvalidCredentials) || errors.Is(err, auth.ErrInvalidPasswordPolicy) {
		WriteError(w, r, NewAppError(stdhttp.StatusBadRequest, ErrorCodeValidationFailed, "请求参数无效"))
		return
	}
	WriteError(w, r, err)
}

func normalizedRoleNames(roles []string) []string {
	result := make([]string, 0, len(roles))
	seen := map[string]struct{}{}
	for _, role := range roles {
		role = strings.ToLower(strings.TrimSpace(role))
		if role == "" {
			continue
		}
		if _, ok := seen[role]; ok {
			continue
		}
		seen[role] = struct{}{}
		result = append(result, role)
	}
	return result
}
