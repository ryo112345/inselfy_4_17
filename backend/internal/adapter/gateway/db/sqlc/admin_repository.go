package sqlc

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
)

// SeedAdmin registers the initial admin (INITIAL_ADMIN_EMAIL) at startup.
// No-op if an admin with that email already exists.
func SeedAdmin(ctx context.Context, pool *pgxpool.Pool, email string) error {
	return generated.New(pool).SeedAdmin(ctx, &generated.SeedAdminParams{Email: email, Name: ""})
}
