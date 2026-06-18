package http

import (
	stdhttp "net/http"

	"github.com/WeOpen/WeOpen/platform/core/plugin"
	"github.com/WeOpen/WeOpen/services/api/internal/domain/auth"
)

// RouteGroup describes a navigable API group for the management UI.
type RouteGroup struct {
	ID          string            `json:"id"`
	Title       string            `json:"title"`
	Description string            `json:"description,omitempty"`
	Routes      []RouteDefinition `json:"routes"`
}

// RouteDefinition is the stable backend-owned route contract shown by /api/routes.
type RouteDefinition struct {
	ID              string              `json:"id"`
	Method          string              `json:"method"`
	Path            string              `json:"path"`
	Summary         string              `json:"summary"`
	Auth            string              `json:"auth"`
	Permissions     []plugin.Permission `json:"permissions,omitempty"`
	Parameters      []RouteParameter    `json:"parameters,omitempty"`
	RequestExample  any                 `json:"requestExample,omitempty"`
	ResponseExample any                 `json:"responseExample,omitempty"`
}

// RouteParameter describes a path, query, header, or body field accepted by a route.
type RouteParameter struct {
	Name        string `json:"name"`
	In          string `json:"in"`
	Required    bool   `json:"required"`
	Description string `json:"description"`
	Example     any    `json:"example,omitempty"`
}

type routeCatalogResponse struct {
	Groups []RouteGroup `json:"groups"`
}

type routeCatalogHandlers struct {
	auth   *auth.Service
	groups []RouteGroup
}

func (h routeCatalogHandlers) routes(w stdhttp.ResponseWriter, r *stdhttp.Request) {
	if r.Method != stdhttp.MethodGet {
		w.Header().Set("Allow", stdhttp.MethodGet)
		WriteError(w, r, NewAppError(stdhttp.StatusMethodNotAllowed, ErrorCodeMethodNotAllowed, "请求方法不允许"))
		return
	}
	if _, err := h.auth.UserForToken(r.Context(), bearerOrCookieToken(r)); err != nil {
		writeAuthSessionError(w, r, err)
		return
	}
	WriteJSON(w, stdhttp.StatusOK, routeCatalogResponse{Groups: h.groups})
}

func routeCatalog(pluginRoutes []PluginRoute) []RouteGroup {
	groups := coreRouteCatalog()
	for _, route := range pluginRoutes {
		if route.Catalog.ID == "" || len(route.Catalog.Routes) == 0 {
			continue
		}
		groups = append(groups, route.Catalog)
	}
	return groups
}

func coreRouteCatalog() []RouteGroup {
	return []RouteGroup{
		{
			ID:          "system",
			Title:       "System",
			Description: "Runtime health and API directory endpoints.",
			Routes: []RouteDefinition{
				route("system.health", stdhttp.MethodGet, "/healthz", "Read service health.", "Public", nil, nil, nil, map[string]any{"status": "ok"}),
				route("system.routes", stdhttp.MethodGet, "/api/routes", "Read the backend-owned API directory.", "Session", nil, nil, nil, map[string]any{
					"groups": []map[string]any{{"id": "system", "routes": []any{}}},
				}),
			},
		},
		{
			ID:          "auth",
			Title:       "Auth",
			Description: "Session, CSRF, password, MFA, and current-user endpoints.",
			Routes: []RouteDefinition{
				route("auth.csrf", stdhttp.MethodGet, "/api/auth/csrf", "Issue a CSRF token cookie and JSON token.", "Public", nil, nil, nil, map[string]string{"token": "csrf_token"}),
				route("auth.login", stdhttp.MethodPost, "/api/auth/login", "Create an HttpOnly session cookie.", "Public", nil, []RouteParameter{
					bodyParam("email", true, "Admin email.", "admin@example.com"),
					bodyParam("password", true, "Admin password.", "admin"),
					bodyParam("totpCode", false, "MFA code when enrollment is enabled.", "123456"),
				}, map[string]string{"email": "admin@example.com", "password": "admin"}, map[string]any{"user": map[string]string{"id": "usr_123", "email": "admin@example.com"}, "expiresAt": "2026-06-16T12:00:00Z"}),
				route("auth.logout", stdhttp.MethodPost, "/api/auth/logout", "Clear the current session.", "Session", nil, nil, nil, map[string]string{"status": "ok"}),
				route("auth.password", stdhttp.MethodPost, "/api/auth/password", "Change the current user's password.", "Session", nil, []RouteParameter{
					bodyParam("currentPassword", true, "Current password.", "admin"),
					bodyParam("newPassword", true, "New password that passes policy.", "NewPassword#123"),
				}, map[string]string{"currentPassword": "admin", "newPassword": "NewPassword#123"}, map[string]string{"status": "ok"}),
				route("auth.mfa.enroll", stdhttp.MethodPost, "/api/auth/mfa/enroll", "Begin MFA enrollment.", "Session", nil, []RouteParameter{
					bodyParam("currentPassword", true, "Current password.", "admin"),
				}, map[string]string{"currentPassword": "admin"}, map[string]string{"secret": "otpauth://..."}),
				route("auth.mfa.verify", stdhttp.MethodPost, "/api/auth/mfa/verify", "Verify and enable MFA enrollment.", "Session", nil, []RouteParameter{
					bodyParam("code", true, "Authenticator code.", "123456"),
				}, map[string]string{"code": "123456"}, map[string]string{"status": "ok"}),
				route("auth.mfa.disable", stdhttp.MethodDelete, "/api/auth/mfa", "Disable MFA for the current user.", "Session", nil, []RouteParameter{
					bodyParam("currentPassword", true, "Current password.", "admin"),
				}, map[string]string{"currentPassword": "admin"}, map[string]string{"status": "ok"}),
				route("auth.me", stdhttp.MethodGet, "/api/me", "Read the current authenticated user.", "Session", nil, nil, nil, map[string]any{"user": map[string]string{"id": "usr_123", "email": "admin@example.com"}}),
			},
		},
		{
			ID:          "admin",
			Title:       "Admin",
			Description: "User, role, and session administration.",
			Routes: []RouteDefinition{
				route("admin.users.list", stdhttp.MethodGet, "/api/admin/users", "List users.", "Permission", []plugin.Permission{plugin.PermissionUserManage}, nil, nil, map[string]any{"users": []any{}}),
				route("admin.users.create", stdhttp.MethodPost, "/api/admin/users", "Create a user.", "Permission", []plugin.Permission{plugin.PermissionUserManage}, []RouteParameter{
					bodyParam("email", true, "User email.", "editor@example.com"),
					bodyParam("displayName", false, "Display name.", "Editor"),
					bodyParam("password", true, "Initial password.", "StrongPassword#123"),
					bodyParam("roles", false, "Role names.", []string{"editor"}),
				}, map[string]any{"email": "editor@example.com", "displayName": "Editor", "password": "StrongPassword#123", "roles": []string{"editor"}}, map[string]any{"user": map[string]string{"id": "usr_456", "email": "editor@example.com"}}),
				route("admin.users.update", stdhttp.MethodPatch, "/api/admin/users/{userId}", "Update user status, display name, or roles.", "Permission", []plugin.Permission{plugin.PermissionUserManage}, []RouteParameter{
					pathParam("userId", "User ID.", "usr_456"),
					bodyParam("displayName", false, "Display name.", "Editor"),
					bodyParam("status", false, "User status.", "active"),
					bodyParam("roles", false, "Role names.", []string{"editor"}),
				}, map[string]any{"displayName": "Editor", "status": "active", "roles": []string{"editor"}}, map[string]any{"user": map[string]string{"id": "usr_456", "status": "active"}}),
				route("admin.roles", stdhttp.MethodGet, "/api/admin/roles", "List RBAC roles.", "Permission", []plugin.Permission{plugin.PermissionUserManage}, nil, nil, map[string]any{"roles": []any{}}),
				route("admin.sessions", stdhttp.MethodGet, "/api/admin/sessions", "List active sessions.", "Permission", []plugin.Permission{plugin.PermissionUserManage}, []RouteParameter{
					queryParam("userId", false, "Filter by user ID.", "usr_456"),
				}, nil, map[string]any{"sessions": []any{}}),
				route("admin.sessions.delete", stdhttp.MethodDelete, "/api/admin/sessions/{sessionId}", "Revoke a session.", "Permission", []plugin.Permission{plugin.PermissionUserManage}, []RouteParameter{
					pathParam("sessionId", "Session ID.", "ses_123"),
				}, nil, map[string]string{"status": "ok"}),
			},
		},
		{
			ID:          "settings",
			Title:       "Settings",
			Description: "Provider secrets and audit logs.",
			Routes: []RouteDefinition{
				route("settings.read", stdhttp.MethodGet, "/api/settings", "Read redacted provider secret summaries.", "Permission", []plugin.Permission{plugin.PermissionSecretRead}, nil, nil, map[string]any{"secrets": []any{}}),
				route("settings.update", stdhttp.MethodPatch, "/api/settings", "Write provider secrets.", "Permission", []plugin.Permission{plugin.PermissionSecretWrite}, []RouteParameter{
					bodyParam("cloudflareApiToken", false, "Cloudflare token.", "****"),
					bodyParam("r2AccessKeyId", false, "R2 access key ID.", "****"),
					bodyParam("r2SecretAccessKey", false, "R2 secret access key.", "****"),
					bodyParam("vercelApiToken", false, "Vercel token.", "****"),
				}, map[string]string{"cloudflareApiToken": "****", "vercelApiToken": "****"}, map[string]any{"secrets": []any{}}),
				route("settings.audit", stdhttp.MethodGet, "/api/audit-logs", "Read audit log entries.", "Permission", []plugin.Permission{plugin.PermissionAuditRead}, nil, nil, map[string]any{"entries": []any{}}),
			},
		},
		{
			ID:          "plugins",
			Title:       "Plugins",
			Description: "Plugin registry state and enablement controls.",
			Routes: []RouteDefinition{
				route("plugins.list", stdhttp.MethodGet, "/api/plugins", "List registered plugins and enabled state.", "Session", nil, nil, nil, map[string]any{"plugins": []any{}}),
				route("plugins.update", stdhttp.MethodPatch, "/api/plugins/{pluginId}", "Enable or disable a plugin.", "Permission", []plugin.Permission{plugin.PermissionPluginManage}, []RouteParameter{
					pathParam("pluginId", "Plugin ID.", "blog"),
					bodyParam("enabled", true, "Enabled state.", true),
				}, map[string]bool{"enabled": true}, map[string]any{"plugins": []any{}}),
			},
		},
	}
}

func route(id string, method string, path string, summary string, auth string, permissions []plugin.Permission, parameters []RouteParameter, requestExample any, responseExample any) RouteDefinition {
	return RouteDefinition{
		ID:              id,
		Method:          method,
		Path:            path,
		Summary:         summary,
		Auth:            auth,
		Permissions:     permissions,
		Parameters:      parameters,
		RequestExample:  requestExample,
		ResponseExample: responseExample,
	}
}

func pathParam(name string, description string, example any) RouteParameter {
	return RouteParameter{Name: name, In: "path", Required: true, Description: description, Example: example}
}

func queryParam(name string, required bool, description string, example any) RouteParameter {
	return RouteParameter{Name: name, In: "query", Required: required, Description: description, Example: example}
}

func bodyParam(name string, required bool, description string, example any) RouteParameter {
	return RouteParameter{Name: name, In: "body", Required: required, Description: description, Example: example}
}
