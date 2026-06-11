package http

import (
	"context"
	"net/http"
	"strings"

	"github.com/WeOpen/WeOpen/internal/core/plugin"
	"github.com/WeOpen/WeOpen/services/api/internal/adapters/secrets"
	"github.com/WeOpen/WeOpen/services/api/internal/domain/audit"
	"github.com/WeOpen/WeOpen/services/api/internal/domain/auth"
	"github.com/WeOpen/WeOpen/services/api/internal/domain/pluginstate"
)

// ServerOptions wires the API surface and keeps auth, audit, plugin, and secret boundaries explicit.
type ServerOptions struct {
	WebOrigin     string
	Auth          *auth.Service
	Secrets       *secrets.Service
	Audit         *audit.Service
	Plugins       *plugin.Registry
	PluginStates  pluginstate.Store
	PluginRoutes  []PluginRoute
	LoginAttempts auth.LoginRateLimitStore
	SecureCookies bool
}

// PluginRoute mounts a plugin-owned handler behind API authentication.
type PluginRoute struct {
	Prefix          string
	Handler         http.Handler
	Permissions     []plugin.Permission
	PermissionRules []PermissionRule
}

// PermissionRule narrows plugin-route permissions by HTTP method and plugin-local path.
type PermissionRule struct {
	Method      string
	Path        string
	Permissions []plugin.Permission
}

// NewServer builds the API router; non-public core and plugin routes require authentication.
func NewServer(options ...ServerOptions) http.Handler {
	opts := ServerOptions{}
	if len(options) > 0 {
		opts = options[0]
	}
	mux := http.NewServeMux()
	var pluginByIDHandler http.Handler
	var pluginStatesForRoutes pluginstate.Store
	mux.HandleFunc("/healthz", healthHandler)
	if opts.Auth != nil {
		authHandlers := authHandlers{
			service:       opts.Auth,
			audit:         opts.Audit,
			loginLimiter:  newLoginRateLimiter(opts.LoginAttempts),
			secureCookies: opts.SecureCookies,
		}
		mux.HandleFunc("/api/auth/csrf", authHandlers.csrf)
		mux.HandleFunc("/api/auth/login", authHandlers.login)
		mux.HandleFunc("/api/auth/logout", authHandlers.logout)
		mux.HandleFunc("/api/auth/password", authHandlers.changePassword)
		mux.HandleFunc("/api/auth/mfa/enroll", authHandlers.mfaEnroll)
		mux.HandleFunc("/api/auth/mfa/verify", authHandlers.mfaVerify)
		mux.HandleFunc("/api/auth/mfa", authHandlers.mfaDisable)
		mux.HandleFunc("/api/me", authHandlers.me)
		adminHandlers := adminHandlers{auth: opts.Auth, audit: opts.Audit}
		mux.HandleFunc("/api/admin/users", adminHandlers.users)
		mux.HandleFunc("/api/admin/users/", adminHandlers.userByID)
		mux.HandleFunc("/api/admin/roles", adminHandlers.roles)
		mux.HandleFunc("/api/admin/sessions", adminHandlers.sessions)
		mux.HandleFunc("/api/admin/sessions/", adminHandlers.sessionByID)
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
	if opts.Auth != nil && opts.Plugins != nil {
		states := opts.PluginStates
		if states == nil {
			states = pluginstate.NewMemoryStore()
		}
		pluginStatesForRoutes = states
		pluginHandlers := pluginHandlers{auth: opts.Auth, registry: opts.Plugins, states: states}
		mux.HandleFunc("/api/plugins", pluginHandlers.plugins)
		mux.HandleFunc("/api/plugins/", pluginHandlers.pluginByID)
		pluginByIDHandler = http.HandlerFunc(pluginHandlers.pluginByID)
	}
	if opts.Auth != nil {
		for _, route := range opts.PluginRoutes {
			prefix := strings.TrimRight(route.Prefix, "/")
			if prefix == "" || route.Handler == nil {
				continue
			}
			handler := authenticatedPluginRoute{
				auth:            opts.Auth,
				prefix:          prefix,
				handler:         route.Handler,
				permissions:     route.Permissions,
				permissionRules: route.PermissionRules,
				registry:        opts.Plugins,
				states:          pluginStatesForRoutes,
			}
			if pluginByIDHandler != nil {
				mux.Handle(prefix, pluginByIDHandler)
			}
			mux.Handle(prefix+"/", handler)
		}
	}
	return Chain(mux, WithRequestID, WithRecovery, WithCORS(opts.WebOrigin), WithCSRF)
}

type authenticatedPluginRoute struct {
	auth            *auth.Service
	prefix          string
	handler         http.Handler
	permissions     []plugin.Permission
	permissionRules []PermissionRule
	registry        *plugin.Registry
	states          pluginstate.Store
}

func (h authenticatedPluginRoute) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	user, err := h.auth.UserForToken(r.Context(), bearerOrCookieToken(r))
	if err != nil {
		writeAuthSessionError(w, r, err)
		return
	}
	if ok, err := h.pluginEnabled(r.Context()); err != nil {
		WriteError(w, r, NewAppError(http.StatusInternalServerError, ErrorCodeInternal, "插件状态读取失败"))
		return
	} else if !ok {
		WriteError(w, r, NewAppError(http.StatusForbidden, ErrorCodeForbidden, "插件已停用"))
		return
	}
	requiredPermissions := h.requiredPermissions(r)
	if !hasPermissions(user, requiredPermissions) {
		WriteError(w, r, NewAppError(http.StatusForbidden, ErrorCodeForbidden, "权限不足"))
		return
	}
	request := r.Clone(r.Context())
	request.Header = r.Header.Clone()
	request.Header.Set("X-WeOpen-Actor-ID", user.ID)
	http.StripPrefix(h.prefix, h.handler).ServeHTTP(w, request)
}

func (h authenticatedPluginRoute) pluginEnabled(ctx context.Context) (bool, error) {
	if h.registry == nil {
		return true, nil
	}
	pluginID := pluginIDFromPrefix(h.prefix)
	if pluginID == "" {
		return true, nil
	}
	registered := h.registry.All()
	manifests := make([]plugin.Manifest, 0, len(registered))
	known := false
	for _, item := range registered {
		manifest := item.Plugin.Manifest()
		manifests = append(manifests, manifest)
		if manifest.ID == pluginID {
			known = true
		}
	}
	if !known {
		return true, nil
	}
	if h.states == nil {
		for _, item := range registered {
			if item.Plugin.ID() == pluginID {
				return item.Enabled, nil
			}
		}
		return true, nil
	}
	if err := h.states.Seed(ctx, manifests); err != nil {
		return false, err
	}
	states, err := h.states.Enabled(ctx)
	if err != nil {
		return false, err
	}
	enabled, ok := states[pluginID]
	if !ok {
		enabled = true
	}
	_ = h.registry.SetEnabled(pluginID, enabled)
	return enabled, nil
}

func pluginIDFromPrefix(prefix string) string {
	prefix = strings.Trim(prefix, "/")
	parts := strings.Split(prefix, "/")
	if len(parts) < 3 || parts[0] != "api" || parts[1] != "plugins" {
		return ""
	}
	return parts[2]
}

func (h authenticatedPluginRoute) requiredPermissions(r *http.Request) []plugin.Permission {
	pluginPath := strings.TrimPrefix(r.URL.Path, h.prefix)
	if pluginPath == "" {
		pluginPath = "/"
	}
	for _, rule := range h.permissionRules {
		if rule.Method != "" && !strings.EqualFold(rule.Method, r.Method) {
			continue
		}
		if matchPermissionPath(rule.Path, pluginPath) {
			return rule.Permissions
		}
	}
	if len(h.permissionRules) > 0 && isUnsafeMethod(r.Method) {
		return []plugin.Permission{"__weopen_unmatched_plugin_route__"}
	}
	return h.permissions
}

func matchPermissionPath(pattern string, path string) bool {
	if pattern == "" || pattern == "*" {
		return true
	}
	pattern = "/" + strings.TrimPrefix(pattern, "/")
	path = "/" + strings.TrimPrefix(path, "/")
	if strings.HasSuffix(pattern, "/*") {
		prefix := strings.TrimSuffix(pattern, "/*")
		return path == prefix || strings.HasPrefix(path, prefix+"/")
	}
	return path == pattern
}

func hasPermissions(user auth.User, required []plugin.Permission) bool {
	if len(required) == 0 {
		return true
	}
	granted := make(map[plugin.Permission]struct{}, len(user.Permissions))
	for _, permission := range user.Permissions {
		granted[permission] = struct{}{}
	}
	for _, permission := range required {
		if _, ok := granted[permission]; !ok {
			return false
		}
	}
	return true
}
