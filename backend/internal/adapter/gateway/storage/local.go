package storage

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
)

type Local struct {
	baseDir   string
	urlPrefix string
}

func NewLocal(baseDir, urlPrefix string) *Local {
	return &Local{baseDir: baseDir, urlPrefix: urlPrefix}
}

func (l *Local) Save(_ context.Context, key string, r io.Reader) (string, error) {
	path := filepath.Join(l.baseDir, key)
	if err := os.MkdirAll(filepath.Dir(path), 0755); err != nil {
		return "", fmt.Errorf("mkdir: %w", err)
	}
	f, err := os.Create(path)
	if err != nil {
		return "", fmt.Errorf("create: %w", err)
	}
	defer f.Close()
	if _, err := io.Copy(f, r); err != nil {
		return "", fmt.Errorf("copy: %w", err)
	}
	return l.URL(key), nil
}

func (l *Local) Open(_ context.Context, key string) (io.ReadCloser, error) {
	path := filepath.Join(l.baseDir, key)
	return os.Open(path)
}

func (l *Local) Delete(_ context.Context, key string) error {
	path := filepath.Join(l.baseDir, key)
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}

func (l *Local) URL(key string) string {
	return fmt.Sprintf("%s/%s", l.urlPrefix, key)
}
