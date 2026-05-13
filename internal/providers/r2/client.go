package r2

import (
	"context"
	"encoding/xml"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"path"
	"strconv"
	"strings"
	"time"
)

var ErrInvalidConfig = errors.New("invalid r2 config")

type httpDoer interface {
	Do(request *http.Request) (*http.Response, error)
}

// Client wraps R2 S3-compatible operations used by WeOpen.
type Client struct {
	config     Config
	endpoint   *url.URL
	httpClient httpDoer
	now        func() time.Time
}

// NewClient validates R2 configuration and creates a client.
func NewClient(config Config) (*Client, error) {
	config.AccountID = strings.TrimSpace(config.AccountID)
	config.Bucket = strings.Trim(strings.TrimSpace(config.Bucket), "/")
	config.AccessKeyID = strings.TrimSpace(config.AccessKeyID)
	config.SecretAccessKey = strings.TrimSpace(config.SecretAccessKey)
	if config.AccountID == "" || config.Bucket == "" || config.AccessKeyID == "" || config.SecretAccessKey == "" {
		return nil, ErrInvalidConfig
	}
	endpointValue := strings.TrimSpace(config.Endpoint)
	if endpointValue == "" {
		endpointValue = fmt.Sprintf("https://%s.r2.cloudflarestorage.com", config.AccountID)
	}
	endpoint, err := url.Parse(endpointValue)
	if err != nil || endpoint.Scheme == "" || endpoint.Host == "" {
		return nil, fmt.Errorf("%w: endpoint", ErrInvalidConfig)
	}
	return &Client{
		config:     config,
		endpoint:   endpoint,
		httpClient: http.DefaultClient,
		now:        time.Now,
	}, nil
}

// ListObjects returns objects from the configured bucket using an S3 ListObjectsV2 request.
func (c *Client) ListObjects(ctx context.Context, input ListObjectsInput) ([]Object, error) {
	query := url.Values{}
	query.Set("list-type", "2")
	if input.Prefix != "" {
		query.Set("prefix", input.Prefix)
	}
	if input.Limit > 0 {
		query.Set("max-keys", strconv.Itoa(input.Limit))
	}
	signed, err := c.presign(ctx, http.MethodGet, "", query, nil, 5*time.Minute)
	if err != nil {
		return nil, err
	}
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, signed.URL, nil)
	if err != nil {
		return nil, err
	}
	response, err := c.httpClient.Do(request)
	if err != nil {
		return nil, fmt.Errorf("list r2 objects: %w", err)
	}
	defer response.Body.Close()
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		return nil, fmt.Errorf("list r2 objects: status %d", response.StatusCode)
	}

	var payload listBucketResult
	if err := xml.NewDecoder(response.Body).Decode(&payload); err != nil {
		return nil, fmt.Errorf("decode r2 object list: %w", err)
	}
	objects := make([]Object, 0, len(payload.Contents))
	for _, item := range payload.Contents {
		objects = append(objects, Object{
			Key:          item.Key,
			Size:         item.Size,
			ETag:         strings.Trim(item.ETag, `"`),
			LastModified: item.LastModified,
		})
	}
	return objects, nil
}

type listBucketResult struct {
	Contents []listBucketObject `xml:"Contents"`
}

type listBucketObject struct {
	Key          string    `xml:"Key"`
	Size         int64     `xml:"Size"`
	ETag         string    `xml:"ETag"`
	LastModified time.Time `xml:"LastModified"`
}

func (c *Client) objectURL(key string, query url.Values) *url.URL {
	objectURL := *c.endpoint
	escapedKey := path.Join(c.config.Bucket, key)
	if key == "" {
		escapedKey = c.config.Bucket
	}
	objectURL.Path = "/" + strings.TrimPrefix(escapedKey, "/")
	objectURL.RawQuery = query.Encode()
	return &objectURL
}
