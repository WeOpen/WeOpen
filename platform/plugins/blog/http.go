package blog

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"
)

// ActorIDHeader carries the authenticated user ID from the API route wrapper.
const ActorIDHeader = "X-WeOpen-Actor-ID"

type postsResponse struct {
	Posts      []Post             `json:"posts"`
	Pagination paginationResponse `json:"pagination"`
}

type paginationResponse struct {
	Limit   int  `json:"limit"`
	Offset  int  `json:"offset"`
	Total   int  `json:"total"`
	HasMore bool `json:"hasMore"`
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
		writeHTTPError(w, http.StatusNotFound, "NOT_FOUND", "blog route not found")
	}
}

func (h httpHandler) posts(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		status := PostStatus(strings.TrimSpace(r.URL.Query().Get("status")))
		filter, err := listPostsFilterFromRequest(r, status)
		if err != nil {
			writeHTTPError(w, http.StatusBadRequest, "VALIDATION_FAILED", err.Error())
			return
		}
		page, err := h.service.ListPostsPage(r.Context(), filter)
		if err != nil {
			writeBlogError(w, err)
			return
		}
		writeHTTPJSON(w, http.StatusOK, postsResponse{
			Posts: page.Posts,
			Pagination: paginationResponse{
				Limit:   page.Limit,
				Offset:  page.Offset,
				Total:   page.Total,
				HasMore: page.HasMore,
			},
		})
	case http.MethodPost:
		var input CreatePostInput
		if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
			writeHTTPError(w, http.StatusBadRequest, "VALIDATION_FAILED", "invalid request JSON")
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
		writeHTTPError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
	}
}

func listPostsFilterFromRequest(r *http.Request, status PostStatus) (ListPostsFilter, error) {
	const (
		defaultLimit = 20
		maxLimit     = 100
	)
	limit, err := intQueryParam(r, "limit", defaultLimit)
	if err != nil {
		return ListPostsFilter{}, err
	}
	if limit <= 0 || limit > maxLimit {
		return ListPostsFilter{}, ErrInvalidPagination
	}
	offset, err := intQueryParam(r, "offset", 0)
	if err != nil {
		return ListPostsFilter{}, err
	}
	if offset < 0 {
		return ListPostsFilter{}, ErrInvalidPagination
	}
	return ListPostsFilter{Status: status, Limit: limit, Offset: offset}, nil
}

func intQueryParam(r *http.Request, name string, fallback int) (int, error) {
	value := strings.TrimSpace(r.URL.Query().Get(name))
	if value == "" {
		return fallback, nil
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return 0, ErrInvalidPagination
	}
	return parsed, nil
}

func (h httpHandler) postByID(w http.ResponseWriter, r *http.Request, id string) {
	if id == "" || strings.Contains(id, "/") {
		writeHTTPError(w, http.StatusNotFound, "NOT_FOUND", "blog post not found")
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
			writeHTTPError(w, http.StatusBadRequest, "VALIDATION_FAILED", "invalid request JSON")
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
		writeHTTPError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "method not allowed")
	}
}

func writeBlogError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, ErrPostNotFound):
		writeHTTPError(w, http.StatusNotFound, "NOT_FOUND", err.Error())
	case errors.Is(err, ErrDuplicateSlug), errors.Is(err, ErrInvalidStatus), errors.Is(err, ErrInvalidPost), errors.Is(err, ErrInvalidPagination):
		writeHTTPError(w, http.StatusBadRequest, "VALIDATION_FAILED", err.Error())
	default:
		writeHTTPError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "blog request failed")
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
