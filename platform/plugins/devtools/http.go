package devtools

import (
	"encoding/json"
	"net/http"
	"strings"
)

type toolsResponse struct {
	Tools  []Tool  `json:"tools"`
	Panels []Panel `json:"panels"`
}

type httpHandler struct{}

// NewHTTPHandler creates the developer tools plugin HTTP handler.
func NewHTTPHandler() http.Handler {
	return httpHandler{}
}

func (h httpHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimSuffix(r.URL.Path, "/")
	if path == "" {
		path = "/"
	}
	switch path {
	case "/tools":
		h.tools(w, r)
	default:
		writeHTTPError(w, http.StatusNotFound, "NOT_FOUND", "devtools route not found")
	}
}

func (h httpHandler) tools(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		writeHTTPError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}
	writeHTTPJSON(w, http.StatusOK, toolsResponse{Tools: Tools(), Panels: Panels()})
}

func writeHTTPJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeHTTPError(w http.ResponseWriter, status int, code string, message string) {
	writeHTTPJSON(w, status, map[string]any{
		"error": map[string]string{
			"code":      code,
			"message":   message,
			"requestId": w.Header().Get("X-Request-Id"),
		},
	})
}
