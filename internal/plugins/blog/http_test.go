package blog

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHTTPHandlerManagesPosts(t *testing.T) {
	t.Parallel()

	handler := NewHTTPHandler(NewService(NewMemoryRepository(), nil))

	createBody := bytes.NewBufferString(`{"title":"HTTP Post","slug":"http-post","summary":"summary","contentMarkdown":"# Body","status":"draft","terms":[{"name":"Go","slug":"go","type":"tag"}]}`)
	createReq := httptest.NewRequest(http.MethodPost, "/posts", createBody)
	createReq.Header.Set(ActorIDHeader, "usr_1")
	createRec := httptest.NewRecorder()
	handler.ServeHTTP(createRec, createReq)

	if createRec.Code != http.StatusCreated {
		t.Fatalf("expected create status %d, got %d body=%s", http.StatusCreated, createRec.Code, createRec.Body.String())
	}
	var created Post
	if err := json.Unmarshal(createRec.Body.Bytes(), &created); err != nil {
		t.Fatalf("expected created post JSON: %v", err)
	}
	if created.ID == "" || created.Status != StatusDraft {
		t.Fatalf("expected draft post response, got %+v", created)
	}

	patchBody := bytes.NewBufferString(`{"title":"HTTP Post","slug":"http-post","summary":"summary","contentMarkdown":"# Published","status":"published","terms":[{"name":"Release","slug":"release","type":"category"}]}`)
	patchReq := httptest.NewRequest(http.MethodPatch, "/posts/"+created.ID, patchBody)
	patchReq.Header.Set(ActorIDHeader, "usr_1")
	patchRec := httptest.NewRecorder()
	handler.ServeHTTP(patchRec, patchReq)

	if patchRec.Code != http.StatusOK {
		t.Fatalf("expected update status %d, got %d body=%s", http.StatusOK, patchRec.Code, patchRec.Body.String())
	}
	var updated Post
	if err := json.Unmarshal(patchRec.Body.Bytes(), &updated); err != nil {
		t.Fatalf("expected updated post JSON: %v", err)
	}
	if updated.Status != StatusPublished || updated.PublishedAt == nil {
		t.Fatalf("expected published post response, got %+v", updated)
	}

	listReq := httptest.NewRequest(http.MethodGet, "/posts", nil)
	listRec := httptest.NewRecorder()
	handler.ServeHTTP(listRec, listReq)

	if listRec.Code != http.StatusOK {
		t.Fatalf("expected list status %d, got %d body=%s", http.StatusOK, listRec.Code, listRec.Body.String())
	}
	var listBody postsResponse
	if err := json.Unmarshal(listRec.Body.Bytes(), &listBody); err != nil {
		t.Fatalf("expected list JSON: %v", err)
	}
	if len(listBody.Posts) != 1 || listBody.Posts[0].ID != created.ID {
		t.Fatalf("expected created post in list, got %+v", listBody.Posts)
	}

	deleteReq := httptest.NewRequest(http.MethodDelete, "/posts/"+created.ID, nil)
	deleteReq.Header.Set(ActorIDHeader, "usr_1")
	deleteRec := httptest.NewRecorder()
	handler.ServeHTTP(deleteRec, deleteReq)

	if deleteRec.Code != http.StatusNoContent {
		t.Fatalf("expected delete status %d, got %d body=%s", http.StatusNoContent, deleteRec.Code, deleteRec.Body.String())
	}
}
