package http

import (
	"context"
	"encoding/json"
	stdhttp "net/http"
	"strings"

	"github.com/WeOpen/WeOpen/internal/core/plugin"
	"github.com/WeOpen/WeOpen/services/api/internal/domain/auth"
	"github.com/WeOpen/WeOpen/services/api/internal/domain/pluginstate"
)

type pluginHandlers struct {
	auth     *auth.Service
	registry *plugin.Registry
	states   pluginstate.Store
}

type pluginResponse struct {
	ID          string                `json:"id"`
	Name        string                `json:"name"`
	Description string                `json:"description"`
	Version     string                `json:"version"`
	Permissions []plugin.Permission   `json:"permissions"`
	Settings    []plugin.SettingField `json:"settings,omitempty"`
	Navigation  []plugin.NavItem      `json:"navigation,omitempty"`
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
	if _, ok := h.requireUser(w, r); !ok {
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
		response.Plugins = append(response.Plugins, pluginResponse{
			ID:          manifest.ID,
			Name:        manifest.Name,
			Description: manifest.Description,
			Version:     manifest.Version,
			Permissions: manifest.Permissions,
			Settings:    manifest.Settings,
			Navigation:  manifest.Navigation,
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

func (h pluginHandlers) requireUser(w stdhttp.ResponseWriter, r *stdhttp.Request) (auth.User, bool) {
	user, err := h.auth.UserForToken(r.Context(), bearerOrCookieToken(r))
	if err != nil {
		WriteError(w, r, NewAppError(stdhttp.StatusUnauthorized, "AUTH_SESSION_EXPIRED", "请重新登录"))
		return auth.User{}, false
	}
	return user, true
}
