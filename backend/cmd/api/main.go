// Package main starts the API server.
package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"

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
	e, cfg, cleanup, err := initializer.BuildServer(context.Background())
	if err != nil {
		return fmt.Errorf("failed to initialize server: %w", err)
	}
	defer cleanup()

	addr := fmt.Sprintf(":%d", cfg.APIPort)
	slog.Info("starting HTTP server", "addr", addr)
	return e.Start(addr)
}
