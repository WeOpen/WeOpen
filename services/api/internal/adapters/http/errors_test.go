package http

import (
	"encoding/json"
	stdhttp "net/http"
	"net/http/httptest"
	"testing"
)

func TestWriteErrorReturnsStableShape(t *testing.T) {
	t.Parallel()

	req := httptest.NewRequest(stdhttp.MethodGet, "/example", nil)
	req.Header.Set("X-Request-Id", "req_test")
	rec := httptest.NewRecorder()

	handler := WithRequestID(stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, r *stdhttp.Request) {
		WriteError(w, r, NewAppError(stdhttp.StatusBadRequest, ErrorCodeValidationFailed, "请求参数无效"))
	}))
	handler.ServeHTTP(rec, req)

	if rec.Code != stdhttp.StatusBadRequest {
		t.Fatalf("expected status %d, got %d", stdhttp.StatusBadRequest, rec.Code)
	}

	var body errorResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("expected JSON error body: %v", err)
	}
	if body.Error.Code != ErrorCodeValidationFailed {
		t.Fatalf("expected validation code, got %q", body.Error.Code)
	}
	if body.Error.RequestID != "req_test" {
		t.Fatalf("expected request id, got %q", body.Error.RequestID)
	}
}

func TestRecoveryConvertsPanicToJSONError(t *testing.T) {
	t.Parallel()

	req := httptest.NewRequest(stdhttp.MethodGet, "/panic", nil)
	req.Header.Set("X-Request-Id", "req_panic")
	rec := httptest.NewRecorder()

	handler := Chain(stdhttp.HandlerFunc(func(stdhttp.ResponseWriter, *stdhttp.Request) {
		panic("boom")
	}), WithRequestID, WithRecovery)

	handler.ServeHTTP(rec, req)

	if rec.Code != stdhttp.StatusInternalServerError {
		t.Fatalf("expected status %d, got %d", stdhttp.StatusInternalServerError, rec.Code)
	}
	var body errorResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("expected JSON error body: %v", err)
	}
	if body.Error.Code != ErrorCodeInternal {
		t.Fatalf("expected internal error code, got %q", body.Error.Code)
	}
	if body.Error.RequestID != "req_panic" {
		t.Fatalf("expected panic request id, got %q", body.Error.RequestID)
	}
}

func TestCORSAllowsConfiguredOrigin(t *testing.T) {
	t.Parallel()

	req := httptest.NewRequest(stdhttp.MethodOptions, "/api", nil)
	req.Header.Set("Origin", "https://app.example.com")
	rec := httptest.NewRecorder()

	handler := WithCORS("https://app.example.com")(stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, _ *stdhttp.Request) {
		w.WriteHeader(stdhttp.StatusOK)
	}))
	handler.ServeHTTP(rec, req)

	if rec.Code != stdhttp.StatusNoContent {
		t.Fatalf("expected status %d, got %d", stdhttp.StatusNoContent, rec.Code)
	}
	if got := rec.Header().Get("Access-Control-Allow-Origin"); got != "https://app.example.com" {
		t.Fatalf("expected configured origin, got %q", got)
	}
}
