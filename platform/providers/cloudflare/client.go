// Package cloudflare adapts Cloudflare's HTTP API to provider-neutral domain inventory contracts.
package cloudflare

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	domainprovider "github.com/WeOpen/WeOpen/platform/providers/domains"
)

var (
	// ErrInvalidConfig indicates that the Cloudflare client cannot be constructed safely.
	ErrInvalidConfig = errors.New("invalid cloudflare config")
	// ErrMissingToken indicates that no API token is available for a provider request.
	ErrMissingToken = errors.New("cloudflare api token is not configured")
	// ErrAPI indicates that Cloudflare returned a non-success response.
	ErrAPI = errors.New("cloudflare api request failed")
)

type httpDoer interface {
	Do(request *http.Request) (*http.Response, error)
}

// TokenSource resolves a Cloudflare API token for the current request.
type TokenSource interface {
	Token(ctx context.Context) (string, error)
}

type staticTokenSource string

func (s staticTokenSource) Token(context.Context) (string, error) {
	return string(s), nil
}

// Config controls Cloudflare API access without exposing tokens in URLs.
type Config struct {
	BaseURL    string
	APIToken   string
	HTTPClient httpDoer
}

// Client reads Cloudflare zones and DNS records through API-token auth.
type Client struct {
	baseURL    *url.URL
	httpClient httpDoer
	token      TokenSource
}

// NewClient creates a Cloudflare client using a static API token.
func NewClient(config Config) (*Client, error) {
	return NewClientWithTokenSource(config, staticTokenSource(config.APIToken))
}

// NewClientWithTokenSource creates a Cloudflare client with a dynamic token source.
func NewClientWithTokenSource(config Config, token TokenSource) (*Client, error) {
	baseURLValue := strings.TrimSpace(config.BaseURL)
	if baseURLValue == "" {
		baseURLValue = "https://api.cloudflare.com"
	}
	baseURL, err := url.Parse(baseURLValue)
	if err != nil || baseURL.Scheme == "" || baseURL.Host == "" {
		return nil, fmt.Errorf("%w: base url", ErrInvalidConfig)
	}
	if token == nil {
		token = staticTokenSource(config.APIToken)
	}
	httpClient := config.HTTPClient
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 15 * time.Second}
	}
	return &Client{baseURL: baseURL, httpClient: httpClient, token: token}, nil
}

// ListDomains returns Cloudflare zones as provider-neutral domain assets.
func (c *Client) ListDomains(ctx context.Context) ([]domainprovider.DomainAsset, error) {
	var assets []domainprovider.DomainAsset
	for page := 1; ; page++ {
		var response apiEnvelope[[]zoneResult]
		if err := c.get(ctx, "/client/v4/zones", pageQuery(page, 50), &response); err != nil {
			return nil, err
		}
		for _, zone := range response.Result {
			assets = append(assets, domainprovider.DomainAsset{
				Provider:    domainprovider.ProviderCloudflare,
				ProviderID:  zone.ID,
				Name:        zone.Name,
				Status:      zone.Status,
				Type:        zone.Type,
				NameServers: append([]string(nil), zone.NameServers...),
			})
		}
		if response.ResultInfo.TotalPages <= page || response.ResultInfo.TotalPages == 0 {
			break
		}
	}
	return assets, nil
}

// ListDNSRecords returns DNS records for a Cloudflare zone.
func (c *Client) ListDNSRecords(ctx context.Context, domain domainprovider.DomainAsset) ([]domainprovider.DNSRecord, error) {
	zoneID := strings.TrimSpace(domain.ProviderID)
	if zoneID == "" {
		return nil, fmt.Errorf("%w: zone id is required", ErrInvalidConfig)
	}

	var records []domainprovider.DNSRecord
	path := "/client/v4/zones/" + url.PathEscape(zoneID) + "/dns_records"
	for page := 1; ; page++ {
		var response apiEnvelope[[]dnsRecordResult]
		if err := c.get(ctx, path, pageQuery(page, 100), &response); err != nil {
			return nil, err
		}
		for _, record := range response.Result {
			records = append(records, domainprovider.DNSRecord{
				ProviderID: record.ID,
				Type:       record.Type,
				Name:       record.Name,
				Content:    record.Content,
				TTL:        record.TTL,
				Proxied:    record.Proxied,
				Priority:   record.Priority,
				Comment:    record.Comment,
				CreatedAt:  record.CreatedOn,
				ModifiedAt: record.ModifiedOn,
			})
		}
		if response.ResultInfo.TotalPages <= page || response.ResultInfo.TotalPages == 0 {
			break
		}
	}
	return records, nil
}

func (c *Client) get(ctx context.Context, path string, query url.Values, target any) error {
	token, err := c.token.Token(ctx)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrMissingToken, err)
	}
	token = strings.TrimSpace(token)
	if token == "" {
		return ErrMissingToken
	}

	apiURL := *c.baseURL
	apiURL.Path = strings.TrimRight(c.baseURL.Path, "/") + path
	apiURL.RawQuery = query.Encode()
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, apiURL.String(), nil)
	if err != nil {
		return err
	}
	request.Header.Set("Accept", "application/json")
	request.Header.Set("Authorization", "Bearer "+token)

	response, err := c.httpClient.Do(request)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrAPI, err)
	}
	defer response.Body.Close()

	if err := json.NewDecoder(response.Body).Decode(target); err != nil {
		return fmt.Errorf("%w: decode response", ErrAPI)
	}
	if envelope, ok := target.(interface {
		cloudflareSuccess() bool
		cloudflareErrors() []apiError
	}); ok {
		if response.StatusCode < 200 || response.StatusCode >= 300 || !envelope.cloudflareSuccess() {
			return safeAPIError(response.StatusCode, envelope.cloudflareErrors(), token)
		}
	}
	return nil
}

func pageQuery(page int, perPage int) url.Values {
	query := url.Values{}
	query.Set("page", strconv.Itoa(page))
	query.Set("per_page", strconv.Itoa(perPage))
	return query
}

type apiEnvelope[T any] struct {
	Success    bool       `json:"success"`
	Errors     []apiError `json:"errors"`
	Result     T          `json:"result"`
	ResultInfo resultInfo `json:"result_info"`
}

func (e *apiEnvelope[T]) cloudflareSuccess() bool {
	return e.Success
}

func (e *apiEnvelope[T]) cloudflareErrors() []apiError {
	return e.Errors
}

type apiError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

type resultInfo struct {
	Page       int `json:"page"`
	TotalPages int `json:"total_pages"`
}

type zoneResult struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Status      string   `json:"status"`
	Type        string   `json:"type"`
	NameServers []string `json:"name_servers"`
}

type dnsRecordResult struct {
	ID         string     `json:"id"`
	Type       string     `json:"type"`
	Name       string     `json:"name"`
	Content    string     `json:"content"`
	TTL        int        `json:"ttl"`
	Proxied    bool       `json:"proxied"`
	Priority   *int       `json:"priority"`
	Comment    string     `json:"comment"`
	CreatedOn  *time.Time `json:"created_on"`
	ModifiedOn *time.Time `json:"modified_on"`
}

func safeAPIError(statusCode int, errors []apiError, token string) error {
	if len(errors) == 0 {
		return fmt.Errorf("%w: status %d", ErrAPI, statusCode)
	}
	first := errors[0]
	message := strings.ReplaceAll(first.Message, token, "[redacted]")
	return fmt.Errorf("%w: status %d code %d: %s", ErrAPI, statusCode, first.Code, message)
}
