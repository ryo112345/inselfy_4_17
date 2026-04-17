package main

import (
	"context"
	"fmt"
	"log"

	"github.com/akiyama/inselfy/backend/internal/driver/config"
	"github.com/akiyama/inselfy/backend/internal/driver/db"
	"github.com/akiyama/inselfy/backend/internal/driver/initializer/api"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	ctx := context.Background()
	pool, err := db.NewPool(ctx, cfg.DatabaseURL())
	if err != nil {
		log.Fatalf("failed to connect to database: %v", err)
	}
	defer pool.Close()

	e := api.BuildServer(pool, cfg)

	addr := fmt.Sprintf(":%d", cfg.APIPort)
	log.Printf("starting server on %s", addr)
	if err := e.Start(addr); err != nil {
		log.Fatalf("failed to start server: %v", err)
	}
}
