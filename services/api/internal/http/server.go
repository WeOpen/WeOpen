package http

import (
	"net/http"
	"strings"

	"github.com/WeOpen/WeOpen/internal/core/plugin"
	"github.com/WeOpen/WeOpen/services/api/internal/audit"
	"github.com/WeOpen/WeOpen/services/api/internal/auth"
	"github.com/WeOpen/WeOpen/services/api/internal/pluginstate"
	"github.com/WeOpen/WeOpen/services/api/internal/secrets"
)

type ServerOptions struct {
	WebOrigin    string
	Auth         *auth.Service
	Secrets      *secrets.Service
	Audit        *audit.Service
	Plugins      *plugin.Registry
	PluginStates pluginstate.Store
	PluginRoutes []PluginRoute
}

type PluginRoute struct {
	Prefix  string
	Handler http.Handler
}

func NewServer(options ...ServerOptions) http.Handler {
	opts := ServerOptions{}
	if len(options) > 0 {
		opts = options[0]
	}
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", healthHandler)
	if opts.Auth != nil {
		authHandlers := authHandlers{service: opts.Auth}
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
				auth:    opts.Auth,
				prefix:  prefix,
				handler: route.Handler,
			}
			mux.Handle(prefix, handler)
			mux.Handle(prefix+"/", handler)
		}
	}
	return Chain(mux, WithRequestID, WithRecovery, WithCORS(opts.WebOrigin))
}

type authenticatedPluginRoute struct {
	auth    *auth.Service
	prefix  string
	handler http.Handler
}

func (h authenticatedPluginRoute) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	user, err := h.auth.UserForToken(r.Context(), bearerOrCookieToken(r))
	if err != nil {
		WriteError(w, r, NewAppError(http.StatusUnauthorized, "AUTH_SESSION_EXPIRED", "请重新登录"))
		return
	}
	request := r.Clone(r.Context())
	request.Header = r.Header.Clone()
	request.Header.Set("X-WeOpen-Actor-ID", user.ID)
	http.StripPrefix(h.prefix, h.handler).ServeHTTP(w, request)
}
