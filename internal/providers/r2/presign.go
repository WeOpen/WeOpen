package r2

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"net/url"
	"sort"
	"strings"
	"time"
)

const (
	algorithm       = "AWS4-HMAC-SHA256"
	unsignedPayload = "UNSIGNED-PAYLOAD"
	r2Region        = "auto"
	s3Service       = "s3"
)

// PresignUpload creates a PUT URL for direct object uploads.
func (c *Client) PresignUpload(ctx context.Context, input PresignUploadInput) (PresignedURL, error) {
	headers := map[string]string{}
	if strings.TrimSpace(input.ContentType) != "" {
		headers["Content-Type"] = strings.TrimSpace(input.ContentType)
	}
	return c.presign(ctx, http.MethodPut, input.Key, nil, headers, input.Expires)
}

// PresignDownload creates a GET URL for temporary object downloads.
func (c *Client) PresignDownload(ctx context.Context, input PresignDownloadInput) (PresignedURL, error) {
	return c.presign(ctx, http.MethodGet, input.Key, nil, nil, input.Expires)
}

func (c *Client) presign(_ context.Context, method string, key string, extraQuery url.Values, headers map[string]string, expires time.Duration) (PresignedURL, error) {
	key = strings.TrimLeft(key, "/")
	if key == "" && method != http.MethodGet {
		return PresignedURL{}, errors.New("r2 object key is required")
	}
	if expires <= 0 {
		expires = time.Hour
	}
	if expires > 7*24*time.Hour {
		expires = 7 * 24 * time.Hour
	}

	now := c.now().UTC()
	date := now.Format("20060102")
	timestamp := now.Format("20060102T150405Z")
	scope := fmt.Sprintf("%s/%s/%s/aws4_request", date, r2Region, s3Service)

	query := url.Values{}
	for key, values := range extraQuery {
		for _, value := range values {
			query.Add(key, value)
		}
	}
	query.Set("X-Amz-Algorithm", algorithm)
	query.Set("X-Amz-Content-Sha256", unsignedPayload)
	query.Set("X-Amz-Credential", c.config.AccessKeyID+"/"+scope)
	query.Set("X-Amz-Date", timestamp)
	query.Set("X-Amz-Expires", fmt.Sprintf("%.0f", expires.Seconds()))

	objectURL := c.objectURL(key, nil)
	signedHeaders, canonicalHeaders := canonicalHeaders(objectURL.Host, headers)
	query.Set("X-Amz-SignedHeaders", signedHeaders)
	objectURL.RawQuery = query.Encode()

	canonicalRequest := strings.Join([]string{
		method,
		escapePath(objectURL.EscapedPath()),
		canonicalQuery(objectURL.Query()),
		canonicalHeaders,
		signedHeaders,
		unsignedPayload,
	}, "\n")
	stringToSign := strings.Join([]string{
		algorithm,
		timestamp,
		scope,
		sha256Hex(canonicalRequest),
	}, "\n")
	signature := hex.EncodeToString(hmacSHA256(signingKey(c.config.SecretAccessKey, date), stringToSign))
	query.Set("X-Amz-Signature", signature)
	objectURL.RawQuery = query.Encode()

	return PresignedURL{
		Method:  method,
		URL:     objectURL.String(),
		Headers: cloneHeaders(headers),
		Expires: now.Add(expires),
	}, nil
}

func canonicalHeaders(host string, headers map[string]string) (string, string) {
	normalized := map[string]string{"host": host}
	for key, value := range headers {
		normalized[strings.ToLower(strings.TrimSpace(key))] = strings.TrimSpace(value)
	}
	keys := make([]string, 0, len(normalized))
	for key := range normalized {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	var builder strings.Builder
	for _, key := range keys {
		builder.WriteString(key)
		builder.WriteByte(':')
		builder.WriteString(normalized[key])
		builder.WriteByte('\n')
	}
	return strings.Join(keys, ";"), builder.String()
}

func canonicalQuery(values url.Values) string {
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)

	var parts []string
	for _, key := range keys {
		sortedValues := append([]string(nil), values[key]...)
		sort.Strings(sortedValues)
		for _, value := range sortedValues {
			parts = append(parts, awsEscape(key)+"="+awsEscape(value))
		}
	}
	return strings.Join(parts, "&")
}

func escapePath(value string) string {
	if value == "" {
		return "/"
	}
	return strings.ReplaceAll(value, "%2F", "/")
}

func awsEscape(value string) string {
	escaped := url.QueryEscape(value)
	escaped = strings.ReplaceAll(escaped, "+", "%20")
	escaped = strings.ReplaceAll(escaped, "%7E", "~")
	return escaped
}

func signingKey(secret string, date string) []byte {
	dateKey := hmacSHA256([]byte("AWS4"+secret), date)
	regionKey := hmacSHA256(dateKey, r2Region)
	serviceKey := hmacSHA256(regionKey, s3Service)
	return hmacSHA256(serviceKey, "aws4_request")
}

func hmacSHA256(key []byte, value string) []byte {
	mac := hmac.New(sha256.New, key)
	mac.Write([]byte(value))
	return mac.Sum(nil)
}

func sha256Hex(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}

func cloneHeaders(headers map[string]string) map[string]string {
	clone := map[string]string{}
	for key, value := range headers {
		clone[key] = value
	}
	return clone
}
