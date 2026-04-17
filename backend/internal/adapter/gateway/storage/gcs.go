package storage

import (
	"context"
	"fmt"
	"io"

	gcs "cloud.google.com/go/storage"
)

// GCS implements port.FileStorage using Google Cloud Storage.
type GCS struct {
	client *gcs.Client
	bucket string
}

func NewGCS(ctx context.Context, bucket string) (*GCS, error) {
	client, err := gcs.NewClient(ctx)
	if err != nil {
		return nil, fmt.Errorf("gcs client: %w", err)
	}
	return &GCS{client: client, bucket: bucket}, nil
}

func (g *GCS) Save(ctx context.Context, key string, r io.Reader) (string, error) {
	w := g.client.Bucket(g.bucket).Object(key).NewWriter(ctx)
	if _, err := io.Copy(w, r); err != nil {
		w.Close()
		return "", fmt.Errorf("gcs write: %w", err)
	}
	if err := w.Close(); err != nil {
		return "", fmt.Errorf("gcs close: %w", err)
	}
	return g.URL(key), nil
}

func (g *GCS) Open(ctx context.Context, key string) (io.ReadCloser, error) {
	return g.client.Bucket(g.bucket).Object(key).NewReader(ctx)
}

func (g *GCS) Delete(ctx context.Context, key string) error {
	err := g.client.Bucket(g.bucket).Object(key).Delete(ctx)
	if err == gcs.ErrObjectNotExist {
		return nil
	}
	return err
}

func (g *GCS) URL(key string) string {
	return fmt.Sprintf("https://storage.googleapis.com/%s/%s", g.bucket, key)
}
