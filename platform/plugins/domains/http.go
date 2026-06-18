package domains

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
)

// ActorIDHeader carries the authenticated user ID from the API route wrapper.
const ActorIDHeader = "X-WeOpen-Actor-ID"

type assetsResponse struct {
	Assets []DomainAsset `json:"assets"`
}

type dnsRecordsResponse struct {
	Records []DNSRecordSnapshot `json:"records"`
}

type httpHandler struct {
	service *Service
}

// NewHTTPHandler creates the domains plugin HTTP handler.
func NewHTTPHandler(service *Service) http.Handler {
	return httpHandler{service: service}
}

func (h httpHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimSuffix(r.URL.Path, "/")
	if path == "" {
		path = "/"
	}
	switch {
	case path == "/assets":
		h.assets(w, r)
	case path == "/sync":
		h.sync(w, r)
	case strings.HasPrefix(path, "/assets/") && strings.HasSuffix(path, "/dns"):
		id := strings.TrimSuffix(strings.TrimPrefix(path, "/assets/"), "/dns")
		h.assetDNS(w, r, id)
	default:
		writeHTTPError(w, http.StatusNotFound, "NOT_FOUND", "domain route not found")
	}
}

func (h httpHandler) assets(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		writeHTTPError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}
	assets, err := h.service.ListAssets(r.Context())
	if err != nil {
		writeDomainError(w, err)
		return
	}
	writeHTTPJSON(w, http.StatusOK, assetsResponse{Assets: assets})
}

func (h httpHandler) sync(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		writeHTTPError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
		return
	}
	result, err := h.service.Sync(r.Context(), r.Header.Get(ActorIDHeader))
	if err != nil {
		writeDomainError(w, err)
		return
	}
	writeHTTPJSON(w, http.StatusCreated, result)
}

func (h httpHandler) assetDNS(w http.ResponseWriter, r *http.Request, id string) {
	if id == "" || strings.Contains(id, "/") {
		writeHTTPError(w, http.StatusNotFound, "NOT_FOUND", "domain asset not found")
		return
	}
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		writeHTTPError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "DNS writes are disabled in v1")
		return
	}
	records, err := h.service.ListDNSRecords(r.Context(), id)
	if err != nil {
		writeDomainError(w, err)
		return
	}
	writeHTTPJSON(w, http.StatusOK, dnsRecordsResponse{Records: records})
}

func writeDomainError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrDomainNotFound):
		writeHTTPError(w, http.StatusNotFound, "NOT_FOUND", err.Error())
	case errors.Is(err, ErrInvalidDomain):
		writeHTTPError(w, http.StatusBadRequest, "VALIDATION_FAILED", err.Error())
	case errors.Is(err, ErrProviderNotConfigured):
		writeHTTPError(w, http.StatusBadRequest, "DOMAIN_TOKEN_INVALID", "Cloudflare API token is not configured")
	case errors.Is(err, ErrDomainSyncFailed):
		writeHTTPError(w, http.StatusBadGateway, "DOMAIN_SYNC_FAILED", "domain provider sync failed")
	default:
		writeHTTPError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "domain request failed")
	}
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
