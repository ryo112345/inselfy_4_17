// Package factory wires concrete implementations into factory functions.
package factory

import (
	"github.com/jackc/pgx/v5/pgxpool"

	gatewaydb "github.com/akiyama/inselfy/backend/internal/adapter/gateway/db"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// NewUserRepoFactory returns a factory function that produces UserRepository instances.
func NewUserRepoFactory(pool *pgxpool.Pool) func() port.UserRepository {
	return func() port.UserRepository {
		return gatewaydb.NewUserRepository(pool)
	}
}
