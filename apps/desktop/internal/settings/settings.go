// Package settings stores desktop-local preferences for remote WeOpen API access.
package settings

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

const connectionTimeout = 5 * time.Second

// RemoteAPISettings is the desktop-local preference set for an API deployment.
type RemoteAPISettings struct {
	BaseURL      string    `json:"baseUrl"`
	SessionToken string    `json:"sessionToken,omitempty"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

// ConnectionStatus is returned to the frontend after probing the configured API.
type ConnectionStatus struct {
	OK        bool      `json:"ok"`
	Status    string    `json:"status,omitempty"`
	Service   string    `json:"service,omitempty"`
	Version   string    `json:"version,omitempty"`
	Error     string    `json:"error,omitempty"`
	CheckedAt time.Time `json:"checkedAt"`
}

type healthPayload struct {
	Status  string `json:"status"`
	Service string `json:"service"`
	Version string `json:"version"`
}

// Store persists remote API settings in a small JSON file.
type Store struct {
	mu     sync.RWMutex
	path   string
	client *http.Client
	now    func() time.Time
}

// NewStore creates a preference store at path. An empty path keeps the store read-only/empty.
func NewStore(path string) *Store {
	return &Store{
		path: path,
		client: &http.Client{
			Timeout: connectionTimeout,
		},
		now: time.Now,
	}
}

// Load reads previously saved remote API settings. Missing settings are treated as unconfigured.
func (s *Store) Load(ctx context.Context) (RemoteAPISettings, error) {
	if err := ctx.Err(); err != nil {
		return RemoteAPISettings{}, err
	}
	if s == nil || strings.TrimSpace(s.path) == "" {
		return RemoteAPISettings{}, nil
	}

	s.mu.RLock()
	defer s.mu.RUnlock()

	data, err := os.ReadFile(s.path)
	if err != nil {
		if os.IsNotExist(err) {
			return RemoteAPISettings{}, nil
		}
		return RemoteAPISettings{}, err
	}

	var settings RemoteAPISettings
	if err := json.Unmarshal(data, &settings); err != nil {
		return RemoteAPISettings{}, err
	}
	normalized, err := normalize(settings, true)
	if err != nil {
		return RemoteAPISettings{}, err
	}
	normalized.UpdatedAt = settings.UpdatedAt
	return normalized, nil
}

// Save validates, normalizes, and persists remote API settings.
func (s *Store) Save(ctx context.Context, input RemoteAPISettings) (RemoteAPISettings, error) {
	if err := ctx.Err(); err != nil {
		return RemoteAPISettings{}, err
	}
	normalized, err := normalize(input, true)
	if err != nil {
		return RemoteAPISettings{}, err
	}
	normalized.UpdatedAt = s.clock().UTC()

	if s == nil || strings.TrimSpace(s.path) == "" {
		return normalized, nil
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	if err := os.MkdirAll(filepath.Dir(s.path), 0o700); err != nil {
		return RemoteAPISettings{}, err
	}
	data, err := json.MarshalIndent(normalized, "", "  ")
	if err != nil {
		return RemoteAPISettings{}, err
	}
	if err := os.WriteFile(s.path, append(data, '\n'), 0o600); err != nil {
		return RemoteAPISettings{}, err
	}
	return normalized, nil
}

// TestConnection probes /healthz using the supplied settings and returns a UI-safe status.
func (s *Store) TestConnection(ctx context.Context, input RemoteAPISettings) (ConnectionStatus, error) {
	status := ConnectionStatus{CheckedAt: s.clock().UTC()}
	if err := ctx.Err(); err != nil {
		status.Error = err.Error()
		return status, err
	}

	normalized, err := normalize(input, true)
	if err != nil {
		status.Error = err.Error()
		return status, nil
	}
	if normalized.BaseURL == "" {
		status.Error = "remote API base URL is not configured"
		return status, nil
	}

	request, err := http.NewRequestWithContext(ctx, http.MethodGet, normalized.BaseURL+"/healthz", nil)
	if err != nil {
		status.Error = err.Error()
		return status, nil
	}
	if normalized.SessionToken != "" {
		request.Header.Set("Authorization", "Bearer "+normalized.SessionToken)
	}
	request.Header.Set("Accept", "application/json")

	response, err := s.httpClient().Do(request)
	if err != nil {
		status.Error = err.Error()
		return status, nil
	}
	defer response.Body.Close()

	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		status.Error = fmt.Sprintf("remote API returned HTTP %d", response.StatusCode)
		return status, nil
	}

	var payload healthPayload
	if err := json.NewDecoder(io.LimitReader(response.Body, 32*1024)).Decode(&payload); err != nil {
		status.Error = err.Error()
		return status, nil
	}
	status.Status = payload.Status
	status.Service = payload.Service
	status.Version = payload.Version
	status.OK = payload.Status == "ok"
	if !status.OK && status.Error == "" {
		status.Error = "remote API health status is not ok"
	}
	return status, nil
}

func (s *Store) clock() time.Time {
	if s == nil || s.now == nil {
		return time.Now()
	}
	return s.now()
}

func (s *Store) httpClient() *http.Client {
	if s == nil || s.client == nil {
		return &http.Client{Timeout: connectionTimeout}
	}
	return s.client
}

func normalize(input RemoteAPISettings, allowEmpty bool) (RemoteAPISettings, error) {
	rawBaseURL := strings.TrimSpace(input.BaseURL)
	normalized := RemoteAPISettings{
		SessionToken: strings.TrimSpace(input.SessionToken),
		UpdatedAt:    input.UpdatedAt,
	}
	if rawBaseURL == "" {
		if allowEmpty {
			return normalized, nil
		}
		return RemoteAPISettings{}, fmt.Errorf("remote API base URL is required")
	}

	parsed, err := url.Parse(rawBaseURL)
	if err != nil {
		return RemoteAPISettings{}, fmt.Errorf("remote API base URL is invalid: %w", err)
	}
	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return RemoteAPISettings{}, fmt.Errorf("remote API base URL must use http or https")
	}
	if parsed.Host == "" {
		return RemoteAPISettings{}, fmt.Errorf("remote API base URL must include a host")
	}
	parsed.RawQuery = ""
	parsed.Fragment = ""
	normalized.BaseURL = strings.TrimRight(parsed.String(), "/")
	return normalized, nil
}
