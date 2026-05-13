package http

import (
	"encoding/json"
	"errors"
	stdhttp "net/http"
)

type ErrorCode string

const (
	ErrorCodeInternal         ErrorCode = "INTERNAL_ERROR"
	ErrorCodeMethodNotAllowed ErrorCode = "METHOD_NOT_ALLOWED"
	ErrorCodeNotFound         ErrorCode = "NOT_FOUND"
	ErrorCodeValidationFailed ErrorCode = "VALIDATION_FAILED"
)

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

func (e AppError) Error() string {
	if e.Err != nil {
		return e.Err.Error()
	}
	return e.Message
}

func (e AppError) Unwrap() error {
	return e.Err
}

func NewAppError(status int, code ErrorCode, message string) AppError {
	return AppError{
		Status:  status,
		Code:    code,
		Message: message,
	}
}

func WriteJSON(w stdhttp.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

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
