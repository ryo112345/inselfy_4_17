package storage

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
)

type Local struct {
	baseDir   string
	urlPrefix string
}

func NewLocal(baseDir, urlPrefix string) *Local {
	return &Local{baseDir: baseDir, urlPrefix: urlPrefix}
}

// resolve は key を baseDir 配下の絶対パスに解決する。
// ".." などで baseDir の外に出る key はパストラバーサルとして拒否する。
func (l *Local) resolve(key string) (string, error) {
	base := filepath.Clean(l.baseDir)
	path := filepath.Join(base, key)
	if path != base && !strings.HasPrefix(path, base+string(os.PathSeparator)) {
		return "", fmt.Errorf("invalid key: %q", key)
	}
	return path, nil
}

func (l *Local) Save(_ context.Context, key string, r io.Reader) (string, error) {
	path, err := l.resolve(key)
	if err != nil {
		return "", err
	}
	if err := os.MkdirAll(filepath.Dir(path), 0o750); err != nil {
		return "", fmt.Errorf("mkdir: %w", err)
	}
	f, err := os.Create(path) //nolint:gosec // G304: resolve() で baseDir 配下であることを検証済み
	if err != nil {
		return "", fmt.Errorf("create: %w", err)
	}
	if _, err := io.Copy(f, r); err != nil {
		_ = f.Close()
		return "", fmt.Errorf("copy: %w", err)
	}
	if err := f.Close(); err != nil {
		return "", fmt.Errorf("close: %w", err)
	}
	return l.URL(key), nil
}

func (l *Local) Open(_ context.Context, key string) (io.ReadCloser, error) {
	path, err := l.resolve(key)
	if err != nil {
		return nil, err
	}
	return os.Open(path) //nolint:gosec // G304: resolve() で baseDir 配下であることを検証済み
}

func (l *Local) Delete(_ context.Context, key string) error {
	path, err := l.resolve(key)
	if err != nil {
		return err
	}
	if err := os.Remove(path); err != nil && !os.IsNotExist(err) {
		return err
	}
	return nil
}

func (l *Local) URL(key string) string {
	return fmt.Sprintf("%s/%s", l.urlPrefix, key)
}
