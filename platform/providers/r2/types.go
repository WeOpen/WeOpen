package r2

import "time"

// Config contains Cloudflare R2 S3-compatible credentials.
type Config struct {
	AccountID       string
	Bucket          string
	AccessKeyID     string
	SecretAccessKey string
	Endpoint        string
}

// Object describes an R2 object returned by list operations.
type Object struct {
	Key          string
	Size         int64
	ETag         string
	LastModified time.Time
}

// ListObjectsInput scopes an object listing request.
type ListObjectsInput struct {
	Prefix string
	Limit  int
}

// PresignUploadInput describes a direct browser upload URL request.
type PresignUploadInput struct {
	Key         string
	ContentType string
	Expires     time.Duration
}

// PresignDownloadInput describes a temporary download URL request.
type PresignDownloadInput struct {
	Key     string
	Expires time.Duration
}

// PresignedURL is a signed operation URL plus headers the caller must send.
type PresignedURL struct {
	Method  string
	URL     string
	Headers map[string]string
	Expires time.Time
}
