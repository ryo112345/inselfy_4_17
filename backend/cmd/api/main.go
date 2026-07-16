// Package main starts the API server.
package main

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"time"

	initializer "github.com/akiyama/inselfy/backend/internal/driver/initializer/api"
	"github.com/akiyama/inselfy/backend/internal/driver/logging"
)

func main() {
	logging.Setup()
	if err := run(); err != nil {
		slog.Error("server exited", "error", err)
		os.Exit(1)
	}
}

func run() error {
	handler, cfg, cleanup, err := initializer.BuildServer(context.Background())
	if err != nil {
		return fmt.Errorf("failed to initialize server: %w", err)
	}
	defer cleanup()

	addr := fmt.Sprintf(":%d", cfg.APIPort)
	slog.Info("starting HTTP server", "addr", addr)
	srv := &http.Server{
		Addr:    addr,
		Handler: handler,
		// ReadTimeout / WriteTimeout は付けない: /api/ws が長寿命接続を張る
		// ため全体タイムアウトは接続を殺す。ヘッダー読み取りとアイドルのみ制限。
		ReadHeaderTimeout: 10 * time.Second,
		IdleTimeout:       120 * time.Second,
	}
	return srv.ListenAndServe()
}
