package http

import (
	"encoding/json"
	stdhttp "net/http"
	"strings"

	"github.com/WeOpen/WeOpen/internal/core/plugin"
	"github.com/WeOpen/WeOpen/services/api/internal/auth"
)

type pluginHandlers struct {
	auth     *auth.Service
	registry *plugin.Registry
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

	if err := h.registry.SetEnabled(id, req.Enabled); err != nil {
		WriteError(w, r, NewAppError(stdhttp.StatusNotFound, ErrorCodeNotFound, "插件不存在"))
		return
	}
	h.list(w, r)
}

func (h pluginHandlers) list(w stdhttp.ResponseWriter, r *stdhttp.Request) {
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

func (h pluginHandlers) requireUser(w stdhttp.ResponseWriter, r *stdhttp.Request) (auth.User, bool) {
	user, err := h.auth.UserForToken(r.Context(), bearerOrCookieToken(r))
	if err != nil {
		WriteError(w, r, NewAppError(stdhttp.StatusUnauthorized, "AUTH_SESSION_EXPIRED", "请重新登录"))
		return auth.User{}, false
	}
	return user, true
}
