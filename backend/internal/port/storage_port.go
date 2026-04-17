package port

import (
	"context"
	"io"
)

// FileStorage abstracts file upload/download operations.
// Local filesystem is used in development; GCS in production.
type FileStorage interface {
	// Save stores the content from r under the given key (e.g. "job-images/uuid.png").
	// Returns the public URL for the stored file.
	Save(ctx context.Context, key string, r io.Reader) (url string, err error)

	// Open returns a ReadCloser for the file at the given key.
	Open(ctx context.Context, key string) (io.ReadCloser, error)

	// Delete removes the file at the given key.
	Delete(ctx context.Context, key string) error

	// URL returns the public/serving URL for the given key.
	URL(key string) string
}
