package blog

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"
)

// ActorIDHeader carries the authenticated user ID from the API route wrapper.
const ActorIDHeader = "X-WeOpen-Actor-ID"

type postsResponse struct {
	Posts []Post `json:"posts"`
}

type httpHandler struct {
	service *Service
}

// NewHTTPHandler creates the blog plugin HTTP route handler.
func NewHTTPHandler(service *Service) http.Handler {
	return httpHandler{service: service}
}

func (h httpHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimSuffix(r.URL.Path, "/")
	if path == "" {
		path = "/"
	}
	switch {
	case path == "/posts":
		h.posts(w, r)
	case strings.HasPrefix(path, "/posts/"):
		h.postByID(w, r, strings.TrimPrefix(path, "/posts/"))
	default:
		writeHTTPError(w, http.StatusNotFound, "blog route not found")
	}
}

func (h httpHandler) posts(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		status := PostStatus(strings.TrimSpace(r.URL.Query().Get("status")))
		posts, err := h.service.ListPosts(r.Context(), ListPostsFilter{Status: status})
		if err != nil {
			writeBlogError(w, err)
			return
		}
		writeHTTPJSON(w, http.StatusOK, postsResponse{Posts: posts})
	case http.MethodPost:
		var input CreatePostInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeHTTPError(w, http.StatusBadRequest, "invalid request JSON")
			return
		}
		post, err := h.service.CreatePost(r.Context(), r.Header.Get(ActorIDHeader), input)
		if err != nil {
			writeBlogError(w, err)
			return
		}
		writeHTTPJSON(w, http.StatusCreated, post)
	default:
		w.Header().Set("Allow", "GET, POST")
		writeHTTPError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func (h httpHandler) postByID(w http.ResponseWriter, r *http.Request, id string) {
	if id == "" || strings.Contains(id, "/") {
		writeHTTPError(w, http.StatusNotFound, "blog post not found")
		return
	}
	switch r.Method {
	case http.MethodGet:
		post, err := h.service.GetPost(r.Context(), id)
		if err != nil {
			writeBlogError(w, err)
			return
		}
		writeHTTPJSON(w, http.StatusOK, post)
	case http.MethodPatch:
		var input UpdatePostInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeHTTPError(w, http.StatusBadRequest, "invalid request JSON")
			return
		}
		post, err := h.service.UpdatePost(r.Context(), r.Header.Get(ActorIDHeader), id, input)
		if err != nil {
			writeBlogError(w, err)
			return
		}
		writeHTTPJSON(w, http.StatusOK, post)
	case http.MethodDelete:
		if err := h.service.DeletePost(r.Context(), r.Header.Get(ActorIDHeader), id); err != nil {
			writeBlogError(w, err)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	default:
		w.Header().Set("Allow", "GET, PATCH, DELETE")
		writeHTTPError(w, http.StatusMethodNotAllowed, "method not allowed")
	}
}

func writeBlogError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrPostNotFound):
		writeHTTPError(w, http.StatusNotFound, err.Error())
	case errors.Is(err, ErrDuplicateSlug), errors.Is(err, ErrInvalidStatus), errors.Is(err, ErrInvalidPost):
		writeHTTPError(w, http.StatusBadRequest, err.Error())
	default:
		writeHTTPError(w, http.StatusInternalServerError, "blog request failed")
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
