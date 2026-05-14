package http

import (
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
	SecureCookies bool
}

// PluginRoute mounts a plugin-owned handler behind API authentication.
type PluginRoute struct {
	Prefix      string
	Handler     http.Handler
	Permissions []plugin.Permission
}

// NewServer builds the API router; non-public core and plugin routes require authentication.
func NewServer(options ...ServerOptions) http.Handler {
	opts := ServerOptions{}
	if len(options) > 0 {
		opts = options[0]
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", healthHandler)
	if opts.Auth != nil {
		authHandlers := authHandlers{service: opts.Auth, secureCookies: opts.SecureCookies}
		mux.HandleFunc("/api/auth/login", authHandlers.login)
		mux.HandleFunc("/api/auth/logout", authHandlers.logout)
		mux.HandleFunc("/api/me", authHandlers.me)
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
		pluginHandlers := pluginHandlers{auth: opts.Auth, registry: opts.Plugins, states: states}
		mux.HandleFunc("/api/plugins", pluginHandlers.plugins)
		mux.HandleFunc("/api/plugins/", pluginHandlers.pluginByID)
	}
	if opts.Auth != nil {
		for _, route := range opts.PluginRoutes {
			prefix := strings.TrimRight(route.Prefix, "/")
			if prefix == "" || route.Handler == nil {
				continue
			}
			handler := authenticatedPluginRoute{
				auth:        opts.Auth,
				prefix:      prefix,
				handler:     route.Handler,
				permissions: route.Permissions,
			}
			mux.Handle(prefix, handler)
			mux.Handle(prefix+"/", handler)
		}
	}
	return Chain(mux, WithRequestID, WithRecovery, WithCORS(opts.WebOrigin))
}

type authenticatedPluginRoute struct {
	auth        *auth.Service
	prefix      string
	handler     http.Handler
	permissions []plugin.Permission
}

func (h authenticatedPluginRoute) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	user, err := h.auth.UserForToken(r.Context(), bearerOrCookieToken(r))
	if err != nil {
		WriteError(w, r, NewAppError(http.StatusUnauthorized, "AUTH_SESSION_EXPIRED", "请重新登录"))
		return
	}
	if !hasPermissions(user, h.permissions) {
		WriteError(w, r, NewAppError(http.StatusForbidden, ErrorCodeForbidden, "权限不足"))
		return
	}
	request := r.Clone(r.Context())
	request.Header = r.Header.Clone()
	request.Header.Set("X-WeOpen-Actor-ID", user.ID)
	http.StripPrefix(h.prefix, h.handler).ServeHTTP(w, request)
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
