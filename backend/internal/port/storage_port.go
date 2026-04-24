package port

import (
	"context"
	"io"
)

type FileStorage interface {
	Save(ctx context.Context, key string, r io.Reader) (url string, err error)
	Open(ctx context.Context, key string) (io.ReadCloser, error)
	Delete(ctx context.Context, key string) error
	URL(key string) string
}
