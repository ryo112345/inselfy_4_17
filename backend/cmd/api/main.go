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

	ctx := context.Background()
	e, cfg, cleanup, err := initializer.BuildServer(ctx)
	if err != nil {
		slog.Error("failed to initialize server", "error", err)
		os.Exit(1)
	}
	defer cleanup()

	addr := fmt.Sprintf(":%d", cfg.APIPort)
	slog.Info("starting HTTP server", "addr", addr)
	if err := e.Start(addr); err != nil {
		slog.Error("server exited", "error", err)
		cleanup()
		os.Exit(1)
	}
}
