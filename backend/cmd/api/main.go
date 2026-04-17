// Package main starts the API server.
package main

import (
	"context"
	"fmt"
	"log"

	initializer "github.com/akiyama/inselfy/backend/internal/driver/initializer/api"
)

func main() {
	ctx := context.Background()
	e, cfg, cleanup, err := initializer.BuildServer(ctx)
	if err != nil {
		log.Fatalf("failed to initialize server: %v", err)
	}
	defer cleanup()

	addr := fmt.Sprintf(":%d", cfg.APIPort)
	log.Printf("starting HTTP server on %s", addr)
	if err := e.Start(addr); err != nil {
		log.Fatalf("server exited: %v", err)
	}
}
