package http

import (
	"encoding/json"
	"errors"
	stdhttp "net/http"
)

// ErrorCode is the stable client-facing API error identifier.
type ErrorCode string

const (
	// ErrorCodeInternal hides unexpected server details from clients.
	ErrorCodeInternal ErrorCode = "INTERNAL_ERROR"
	// ErrorCodeMethodNotAllowed reports unsupported HTTP methods.
	ErrorCodeMethodNotAllowed ErrorCode = "METHOD_NOT_ALLOWED"
	// ErrorCodeNotFound reports missing API resources.
	ErrorCodeNotFound ErrorCode = "NOT_FOUND"
	// ErrorCodeForbidden reports authenticated requests that lack required permissions.
	ErrorCodeForbidden ErrorCode = "FORBIDDEN"
	// ErrorCodeValidationFailed reports invalid client input.
	ErrorCodeValidationFailed ErrorCode = "VALIDATION_FAILED"
)

// AppError carries the sanitized API error contract plus optional internal cause.
type AppError struct {
	Code    ErrorCode
	Message string
	Status  int
	Err     error
}

type errorResponse struct {
	Error errorBody `json:"error"`
}

type errorBody struct {
	Code      ErrorCode `json:"code"`
	Message   string    `json:"message"`
	RequestID string    `json:"requestId"`
}

// Error returns the internal cause when present and otherwise the client message.
func (e AppError) Error() string {
	if e.Err != nil {
		return e.Err.Error()
	}
	return e.Message
}

// Unwrap exposes the internal cause for errors.Is and errors.As.
func (e AppError) Unwrap() error {
	return e.Err
}

// NewAppError creates a sanitized API error for stable JSON responses.
func NewAppError(status int, code ErrorCode, message string) AppError {
	return AppError{
		Status:  status,
		Code:    code,
		Message: message,
	}
}

// WriteJSON writes a JSON response and deliberately ignores encode errors after headers are sent.
func WriteJSON(w stdhttp.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

// WriteError converts errors to the unified JSON error shape without leaking internal causes.
func WriteError(w stdhttp.ResponseWriter, r *stdhttp.Request, err error) {
	appErr := AppError{}
	if !errors.As(err, &appErr) {
		appErr = NewAppError(stdhttp.StatusInternalServerError, ErrorCodeInternal, "服务器内部错误")
	}
	if appErr.Status == 0 {
		appErr.Status = stdhttp.StatusInternalServerError
	}
	if appErr.Code == "" {
		appErr.Code = ErrorCodeInternal
	}
	if appErr.Message == "" {
		appErr.Message = "服务器内部错误"
	}

	WriteJSON(w, appErr.Status, errorResponse{
		Error: errorBody{
			Code:      appErr.Code,
			Message:   appErr.Message,
			RequestID: RequestIDFromContext(r.Context()),
		},
	})
}
