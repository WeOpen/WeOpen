package http

import (
	"context"
	"encoding/json"
	stdhttp "net/http"
	"strings"

	"github.com/WeOpen/WeOpen/platform/core/plugin"
	"github.com/WeOpen/WeOpen/services/api/internal/domain/auth"
	"github.com/WeOpen/WeOpen/services/api/internal/domain/pluginstate"
)

type pluginHandlers struct {
	auth       *auth.Service
	registry   *plugin.Registry
	states     pluginstate.Store
	routeIndex map[string]RouteGroup
}

type pluginResponse struct {
	ID          string                `json:"id"`
	Name        string                `json:"name"`
	Description string                `json:"description"`
	Version     string                `json:"version"`
	Permissions []plugin.Permission   `json:"permissions"`
	Settings    []plugin.SettingField `json:"settings,omitempty"`
	Navigation  []plugin.NavItem      `json:"navigation,omitempty"`
	RouteGroup  *RouteGroup           `json:"routeGroup,omitempty"`
	RouteCount  int                   `json:"routeCount"`
	RoutePrefix string                `json:"routePrefix,omitempty"`
	Enabled     bool                  `json:"enabled"`
}

type pluginsResponse struct {
	Plugins []pluginResponse `json:"plugins"`
}

type pluginUpdateRequest struct {
	Enabled bool `json:"enabled"`
}

func (h pluginHandlers) plugins(w stdhttp.ResponseWriter, r *stdhttp.Request) {
	if _, ok := h.requireUser(w, r); !ok {
		return
	}
	if r.Method != stdhttp.MethodGet {
		w.Header().Set("Allow", stdhttp.MethodGet)
		WriteError(w, r, NewAppError(stdhttp.StatusMethodNotAllowed, ErrorCodeMethodNotAllowed, "请求方法不允许"))
		return
	}
	h.list(w, r)
}

func (h pluginHandlers) pluginByID(w stdhttp.ResponseWriter, r *stdhttp.Request) {
	if _, ok := h.requirePermissions(w, r, plugin.PermissionPluginManage); !ok {
		return
	}
	if r.Method != stdhttp.MethodPatch {
		w.Header().Set("Allow", stdhttp.MethodPatch)
		WriteError(w, r, NewAppError(stdhttp.StatusMethodNotAllowed, ErrorCodeMethodNotAllowed, "请求方法不允许"))
		return
	}

	id := strings.TrimPrefix(r.URL.Path, "/api/plugins/")
	if id == "" || strings.Contains(id, "/") {
		WriteError(w, r, NewAppError(stdhttp.StatusNotFound, ErrorCodeNotFound, "插件不存在"))
		return
	}

	var req pluginUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, r, NewAppError(stdhttp.StatusBadRequest, ErrorCodeValidationFailed, "请求 JSON 无效"))
		return
	}

	registered, ok := h.findRegisteredPlugin(id)
	if !ok {
		WriteError(w, r, NewAppError(stdhttp.StatusNotFound, ErrorCodeNotFound, "插件不存在"))
		return
	}
	if err := h.states.SetEnabled(r.Context(), registered.Plugin.Manifest(), req.Enabled); err != nil {
		WriteError(w, r, NewAppError(stdhttp.StatusInternalServerError, ErrorCodeInternal, "插件状态保存失败"))
		return
	}
	_ = h.registry.SetEnabled(id, req.Enabled)
	h.list(w, r)
}

func (h pluginHandlers) list(w stdhttp.ResponseWriter, r *stdhttp.Request) {
	if err := h.syncRegistryState(r.Context()); err != nil {
		WriteError(w, r, NewAppError(stdhttp.StatusInternalServerError, ErrorCodeInternal, "插件状态读取失败"))
		return
	}
	registered := h.registry.All()
	response := pluginsResponse{Plugins: make([]pluginResponse, 0, len(registered))}
	for _, item := range registered {
		manifest := item.Plugin.Manifest()
		routeGroup := h.routeIndex[manifest.ID]
		response.Plugins = append(response.Plugins, pluginResponse{
			ID:          manifest.ID,
			Name:        manifest.Name,
			Description: manifest.Description,
			Version:     manifest.Version,
			Permissions: manifest.Permissions,
			Settings:    manifest.Settings,
			Navigation:  manifest.Navigation,
			RouteGroup:  routeGroupOrNil(routeGroup),
			RouteCount:  len(routeGroup.Routes),
			RoutePrefix: pluginRoutePrefix(routeGroup),
			Enabled:     item.Enabled,
		})
	}
	WriteJSON(w, stdhttp.StatusOK, response)
}

func (h pluginHandlers) syncRegistryState(ctx context.Context) error {
	registered := h.registry.All()
	manifests := make([]plugin.Manifest, 0, len(registered))
	for _, item := range registered {
		manifests = append(manifests, item.Plugin.Manifest())
	}
	if err := h.states.Seed(ctx, manifests); err != nil {
		return err
	}
	states, err := h.states.Enabled(ctx)
	if err != nil {
		return err
	}
	for _, item := range registered {
		manifest := item.Plugin.Manifest()
		enabled, ok := states[manifest.ID]
		if !ok {
			enabled = true
		}
		if err := h.registry.SetEnabled(manifest.ID, enabled); err != nil {
			return err
		}
	}
	return nil
}

func (h pluginHandlers) findRegisteredPlugin(id string) (plugin.RegisteredPlugin, bool) {
	for _, item := range h.registry.All() {
		if item.Plugin.ID() == id {
			return item, true
		}
	}
	return plugin.RegisteredPlugin{}, false
}

func pluginRouteIndex(routes []PluginRoute) map[string]RouteGroup {
	index := map[string]RouteGroup{}
	for _, route := range routes {
		pluginID := pluginIDFromPrefix(route.Prefix)
		if pluginID == "" || route.Catalog.ID == "" {
			continue
		}
		index[pluginID] = route.Catalog
	}
	return index
}

func routeGroupOrNil(group RouteGroup) *RouteGroup {
	if group.ID == "" && len(group.Routes) == 0 {
		return nil
	}
	return &group
}

func pluginRoutePrefix(group RouteGroup) string {
	for _, route := range group.Routes {
		if strings.HasPrefix(route.Path, "/api/plugins/") {
			parts := strings.Split(strings.Trim(route.Path, "/"), "/")
			if len(parts) >= 3 {
				return "/" + strings.Join(parts[:3], "/")
			}
		}
	}
	return ""
}

func (h pluginHandlers) requireUser(w stdhttp.ResponseWriter, r *stdhttp.Request) (auth.User, bool) {
	user, err := h.auth.UserForToken(r.Context(), bearerOrCookieToken(r))
	if err != nil {
		writeAuthSessionError(w, r, err)
		return auth.User{}, false
	}
	return user, true
}

func (h pluginHandlers) requirePermissions(w stdhttp.ResponseWriter, r *stdhttp.Request, permissions ...plugin.Permission) (auth.User, bool) {
	user, ok := h.requireUser(w, r)
	if !ok {
		return auth.User{}, false
	}
	if !hasPermissions(user, permissions) {
		WriteError(w, r, NewAppError(stdhttp.StatusForbidden, ErrorCodeForbidden, "权限不足"))
		return auth.User{}, false
	}
	return user, true
}
