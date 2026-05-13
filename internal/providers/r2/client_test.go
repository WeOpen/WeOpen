package r2

import (
	"context"
	"io"
	"net/http"
	"strings"
	"testing"
	"time"
)

func TestNewClientValidatesConfig(t *testing.T) {
	t.Parallel()

	if _, err := NewClient(Config{}); err == nil {
		t.Fatal("expected missing configuration error")
	}
	if _, err := NewClient(Config{
		AccountID:       "account",
		Bucket:          "bucket",
		AccessKeyID:     "access",
		SecretAccessKey: "secret",
	}); err != nil {
		t.Fatalf("expected valid client: %v", err)
	}
}

func TestPresignedUploadAndDownloadURLsUseR2EndpointAndSigV4(t *testing.T) {
	t.Parallel()

	client := newTestClient(t)
	client.now = func() time.Time { return time.Date(2026, 5, 13, 9, 0, 0, 0, time.UTC) }

	upload, err := client.PresignUpload(context.Background(), PresignUploadInput{
		Key:         "covers/hello.png",
		ContentType: "image/png",
		Expires:     time.Hour,
	})
	if err != nil {
		t.Fatalf("expected upload URL: %v", err)
	}
	if upload.Method != http.MethodPut {
		t.Fatalf("expected PUT upload, got %s", upload.Method)
	}
	if upload.Headers["Content-Type"] != "image/png" {
		t.Fatalf("expected content type header, got %+v", upload.Headers)
	}
	if !strings.HasPrefix(upload.URL, "https://test-account.r2.cloudflarestorage.com/test-bucket/covers/hello.png?") {
		t.Fatalf("expected R2 object URL, got %s", upload.URL)
	}
	for _, part := range []string{
		"X-Amz-Algorithm=AWS4-HMAC-SHA256",
		"X-Amz-Credential=test-access%2F20260513%2Fauto%2Fs3%2Faws4_request",
		"X-Amz-Expires=3600",
		"X-Amz-SignedHeaders=content-type%3Bhost",
		"X-Amz-Signature=",
	} {
		if !strings.Contains(upload.URL, part) {
			t.Fatalf("expected upload URL to contain %q, got %s", part, upload.URL)
		}
	}

	download, err := client.PresignDownload(context.Background(), PresignDownloadInput{
		Key:     "covers/hello.png",
		Expires: 30 * time.Minute,
	})
	if err != nil {
		t.Fatalf("expected download URL: %v", err)
	}
	if download.Method != http.MethodGet {
		t.Fatalf("expected GET download, got %s", download.Method)
	}
	if !strings.Contains(download.URL, "X-Amz-Expires=1800") {
		t.Fatalf("expected 30 minute expiry, got %s", download.URL)
	}
}

func TestListObjectsUsesMockHTTPClient(t *testing.T) {
	t.Parallel()

	var requestedURL string
	client := newTestClient(t)
	client.httpClient = roundTripFunc(func(request *http.Request) (*http.Response, error) {
		requestedURL = request.URL.String()
		return xmlResponse(200, `<ListBucketResult>
  <Contents>
    <Key>uploads/a.txt</Key>
    <Size>12</Size>
    <LastModified>2026-05-13T08:30:00.000Z</LastModified>
    <ETag>&quot;etag-a&quot;</ETag>
  </Contents>
</ListBucketResult>`), nil
	})

	objects, err := client.ListObjects(context.Background(), ListObjectsInput{Prefix: "uploads/"})
	if err != nil {
		t.Fatalf("expected object list: %v", err)
	}
	if !strings.Contains(requestedURL, "list-type=2") || !strings.Contains(requestedURL, "prefix=uploads%2F") {
		t.Fatalf("expected list query, got %s", requestedURL)
	}
	if len(objects) != 1 {
		t.Fatalf("expected 1 object, got %+v", objects)
	}
	if objects[0].Key != "uploads/a.txt" || objects[0].Size != 12 {
		t.Fatalf("expected parsed object, got %+v", objects[0])
	}
}

func newTestClient(t *testing.T) *Client {
	t.Helper()
	client, err := NewClient(Config{
		AccountID:       "test-account",
		Bucket:          "test-bucket",
		AccessKeyID:     "test-access",
		SecretAccessKey: "test-secret",
	})
	if err != nil {
		t.Fatalf("expected client: %v", err)
	}
	return client
}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (f roundTripFunc) Do(request *http.Request) (*http.Response, error) {
	return f(request)
}

func xmlResponse(status int, body string) *http.Response {
	return &http.Response{
		StatusCode: status,
		Body:       io.NopCloser(strings.NewReader(body)),
		Header:     http.Header{"Content-Type": []string{"application/xml"}},
	}
}
