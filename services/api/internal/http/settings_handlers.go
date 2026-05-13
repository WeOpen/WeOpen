package http

import (
	"encoding/json"
	stdhttp "net/http"

	"github.com/WeOpen/WeOpen/services/api/internal/audit"
	"github.com/WeOpen/WeOpen/services/api/internal/auth"
	"github.com/WeOpen/WeOpen/services/api/internal/secrets"
)

type settingsHandlers struct {
	auth    *auth.Service
	secrets *secrets.Service
	audit   *audit.Service
}

type settingsResponse struct {
	Secrets []secrets.Secret `json:"secrets"`
}

type settingsUpdateRequest struct {
	CloudflareAPIToken string `json:"cloudflareApiToken"`
	R2AccessKeyID      string `json:"r2AccessKeyId"`
	R2SecretAccessKey  string `json:"r2SecretAccessKey"`
	VercelAPIToken     string `json:"vercelApiToken"`
}

func (h settingsHandlers) settings(w stdhttp.ResponseWriter, r *stdhttp.Request) {
	user, ok := h.requireUser(w, r)
	if !ok {
		return
	}

	switch r.Method {
	case stdhttp.MethodGet:
		h.writeSettings(w, r)
	case stdhttp.MethodPatch:
		h.updateSettings(w, r, user)
	default:
		w.Header().Set("Allow", "GET, PATCH")
		WriteError(w, r, NewAppError(stdhttp.StatusMethodNotAllowed, ErrorCodeMethodNotAllowed, "请求方法不允许"))
	}
}

func (h settingsHandlers) auditLogs(w stdhttp.ResponseWriter, r *stdhttp.Request) {
	if _, ok := h.requireUser(w, r); !ok {
		return
	}
	if r.Method != stdhttp.MethodGet {
		w.Header().Set("Allow", stdhttp.MethodGet)
		WriteError(w, r, NewAppError(stdhttp.StatusMethodNotAllowed, ErrorCodeMethodNotAllowed, "请求方法不允许"))
		return
	}

	entries, err := h.audit.List(r.Context())
	if err != nil {
		WriteError(w, r, err)
		return
	}
	WriteJSON(w, stdhttp.StatusOK, map[string]any{"entries": entries})
}

func (h settingsHandlers) updateSettings(w stdhttp.ResponseWriter, r *stdhttp.Request, user auth.User) {
	var req settingsUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		WriteError(w, r, NewAppError(stdhttp.StatusBadRequest, ErrorCodeValidationFailed, "请求 JSON 无效"))
		return
	}

	changed := map[string]string{}
	if req.CloudflareAPIToken != "" {
		changed["cloudflare.api-token"] = req.CloudflareAPIToken
	}
	if req.R2AccessKeyID != "" {
		changed["r2.access-key-id"] = req.R2AccessKeyID
	}
	if req.R2SecretAccessKey != "" {
		changed["r2.secret-access-key"] = req.R2SecretAccessKey
	}
	if req.VercelAPIToken != "" {
		changed["vercel.api-token"] = req.VercelAPIToken
	}

	for key, value := range changed {
		provider, name := splitProviderSecret(key)
		if _, err := h.secrets.PutSecret(r.Context(), provider, name, value); err != nil {
			WriteError(w, r, err)
			return
		}
	}

	if len(changed) > 0 {
		if _, err := h.audit.Record(r.Context(), audit.Entry{
			ActorUserID: user.ID,
			Action:      "settings.update",
			TargetType:  "settings",
			Metadata: map[string]any{
				"changedSecrets": len(changed),
			},
		}); err != nil {
			WriteError(w, r, err)
			return
		}
	}

	h.writeSettings(w, r)
}

func (h settingsHandlers) writeSettings(w stdhttp.ResponseWriter, r *stdhttp.Request) {
	summaries, err := h.secrets.List(r.Context())
	if err != nil {
		WriteError(w, r, err)
		return
	}
	WriteJSON(w, stdhttp.StatusOK, settingsResponse{Secrets: summaries})
}

func (h settingsHandlers) requireUser(w stdhttp.ResponseWriter, r *stdhttp.Request) (auth.User, bool) {
	user, err := h.auth.UserForToken(r.Context(), bearerOrCookieToken(r))
	if err != nil {
		WriteError(w, r, NewAppError(stdhttp.StatusUnauthorized, "AUTH_SESSION_EXPIRED", "请重新登录"))
		return auth.User{}, false
	}
	return user, true
}

func splitProviderSecret(key string) (string, string) {
	for index, char := range key {
		if char == '.' {
			return key[:index], key[index+1:]
		}
	}
	return key, "default"
}
