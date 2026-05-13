package storage_r2

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
)

// ActorIDHeader carries the authenticated user ID from the API route wrapper.
const ActorIDHeader = "X-WeOpen-Actor-ID"

type objectsResponse struct {
	Objects []StorageObject `json:"objects"`
}

type visibilityRequest struct {
	Visibility Visibility `json:"visibility"`
}

type httpHandler struct {
	service *Service
}

// NewHTTPHandler creates the storage plugin HTTP handler.
func NewHTTPHandler(service *Service) http.Handler {
	return httpHandler{service: service}
}

func (h httpHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimSuffix(r.URL.Path, "/")
	if path == "" {
		path = "/"
	}
	switch {
	case path == "/objects":
		h.objects(w, r)
	case path == "/upload-url":
		h.uploadURL(w, r)
	case path == "/objects/complete":
		h.complete(w, r)
	case strings.HasPrefix(path, "/objects/"):
		h.objectByID(w, r, strings.TrimPrefix(path, "/objects/"))
	default:
		writeHTTPError(w, http.StatusNotFound, "storage route not found")
	}
}

func (h httpHandler) objects(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		w.Header().Set("Allow", http.MethodGet)
		writeHTTPError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	objects, err := h.service.ListObjects(r.Context())
	if err != nil {
		writeStorageError(w, err)
		return
	}
	writeHTTPJSON(w, http.StatusOK, objectsResponse{Objects: objects})
}

func (h httpHandler) uploadURL(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		writeHTTPError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var input CreateUploadInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeHTTPError(w, http.StatusBadRequest, "invalid request JSON")
		return
	}
	result, err := h.service.CreateUploadURL(r.Context(), r.Header.Get(ActorIDHeader), input)
	if err != nil {
		writeStorageError(w, err)
		return
	}
	writeHTTPJSON(w, http.StatusCreated, result)
}

func (h httpHandler) complete(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		writeHTTPError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var input CompleteUploadInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		writeHTTPError(w, http.StatusBadRequest, "invalid request JSON")
		return
	}
	object, err := h.service.CompleteUpload(r.Context(), r.Header.Get(ActorIDHeader), input)
	if err != nil {
		writeStorageError(w, err)
		return
	}
	writeHTTPJSON(w, http.StatusCreated, object)
}

func (h httpHandler) objectByID(w http.ResponseWriter, r *http.Request, id string) {
	if id == "" || strings.Contains(id, "/") {
		writeHTTPError(w, http.StatusNotFound, "storage object not found")
		return
	}
	switch r.Method {
	case http.MethodPatch:
		var input visibilityRequest
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeHTTPError(w, http.StatusBadRequest, "invalid request JSON")
			return
		}
		object, err := h.service.SetVisibility(r.Context(), r.Header.Get(ActorIDHeader), id, input.Visibility)
		if err != nil {
			writeStorageError(w, err)
			return
		}
		writeHTTPJSON(w, http.StatusOK, object)
	case http.MethodDelete:
		if err := h.service.DeleteObject(r.Context(), r.Header.Get(ActorIDHeader), id); err != nil {
			writeStorageError(w, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	default:
		w.Header().Set("Allow", "PATCH, DELETE")
		writeHTTPError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func writeStorageError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrObjectNotFound):
		writeHTTPError(w, http.StatusNotFound, err.Error())
	case errors.Is(err, ErrInvalidObject), errors.Is(err, ErrInvalidVisibility):
		writeHTTPError(w, http.StatusBadRequest, err.Error())
	default:
		writeHTTPError(w, http.StatusInternalServerError, "storage request failed")
	}
}

func writeHTTPJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeHTTPError(w http.ResponseWriter, status int, message string) {
	writeHTTPJSON(w, status, map[string]any{
		"error": map[string]string{
			"message": message,
		},
	})
}
