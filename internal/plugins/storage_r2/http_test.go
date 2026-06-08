package storage_r2

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestHTTPHandlerSupportsUploadCompleteListAndDelete(t *testing.T) {
	t.Parallel()

	service := NewService(NewMemoryRepository(), &fakeProvider{}, nil)
	handler := NewHTTPHandler(service)

	uploadReq := httptest.NewRequest(http.MethodPost, "/upload-url", bytes.NewBufferString(`{"key":"uploads/a.txt","filename":"a.txt","contentType":"text/plain","size":42,"visibility":"private"}`))
	uploadReq.Header.Set(ActorIDHeader, "usr_1")
	uploadRec := httptest.NewRecorder()
	handler.ServeHTTP(uploadRec, uploadReq)
	if uploadRec.Code != http.StatusCreated {
		t.Fatalf("expected upload status %d, got %d body=%s", http.StatusCreated, uploadRec.Code, uploadRec.Body.String())
	}

	completeReq := httptest.NewRequest(http.MethodPost, "/objects/complete", bytes.NewBufferString(`{"key":"uploads/a.txt","filename":"a.txt","contentType":"text/plain","size":42,"visibility":"private"}`))
	completeReq.Header.Set(ActorIDHeader, "usr_1")
	completeRec := httptest.NewRecorder()
	handler.ServeHTTP(completeRec, completeReq)
	if completeRec.Code != http.StatusCreated {
		t.Fatalf("expected complete status %d, got %d body=%s", http.StatusCreated, completeRec.Code, completeRec.Body.String())
	}
	var object StorageObject
	if err := json.Unmarshal(completeRec.Body.Bytes(), &object); err != nil {
		t.Fatalf("expected object JSON: %v", err)
	}

	listReq := httptest.NewRequest(http.MethodGet, "/objects", nil)
	listRec := httptest.NewRecorder()
	handler.ServeHTTP(listRec, listReq)
	if listRec.Code != http.StatusOK {
		t.Fatalf("expected list status %d, got %d body=%s", http.StatusOK, listRec.Code, listRec.Body.String())
	}

	deleteReq := httptest.NewRequest(http.MethodDelete, "/objects/"+object.ID, nil)
	deleteReq.Header.Set(ActorIDHeader, "usr_1")
	deleteRec := httptest.NewRecorder()
	handler.ServeHTTP(deleteRec, deleteReq)
	if deleteRec.Code != http.StatusNoContent {
		t.Fatalf("expected delete status %d, got %d body=%s", http.StatusNoContent, deleteRec.Code, deleteRec.Body.String())
	}
}
