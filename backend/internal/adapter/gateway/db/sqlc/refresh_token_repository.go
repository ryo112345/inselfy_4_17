package sqlc

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
	"github.com/akiyama/inselfy/backend/internal/domain/auth"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type RefreshTokenRepository struct {
	queries *generated.Queries
}

var _ port.RefreshTokenRepository = (*RefreshTokenRepository)(nil)

func NewRefreshTokenRepository(pool *pgxpool.Pool) *RefreshTokenRepository {
	return &RefreshTokenRepository{queries: generated.New(pool)}
}

func (r *RefreshTokenRepository) Create(ctx context.Context, rt *auth.RefreshToken) error {
	q := queriesForContext(ctx, r.queries)
	userID, err := parseUUID(rt.UserID)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	return q.CreateRefreshToken(ctx, &generated.CreateRefreshTokenParams{
		UserID:    userID,
		TokenHash: rt.TokenHash,
		ExpiresAt: pgtype.Timestamptz{Time: rt.ExpiresAt, Valid: true},
	})
}

func (r *RefreshTokenRepository) GetByTokenHash(ctx context.Context, tokenHash string) (*auth.RefreshToken, error) {
	q := queriesForContext(ctx, r.queries)
	row, err := q.GetRefreshTokenByHash(ctx, tokenHash)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	rt := &auth.RefreshToken{
		ID:        uuidToString(row.ID),
		UserID:    uuidToString(row.UserID),
		TokenHash: row.TokenHash,
		ExpiresAt: row.ExpiresAt.Time,
		CreatedAt: row.CreatedAt.Time,
	}
	if row.RevokedAt.Valid {
		t := row.RevokedAt.Time
		rt.RevokedAt = &t
	}
	return rt, nil
}

func (r *RefreshTokenRepository) RevokeByID(ctx context.Context, id string) error {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	return q.RevokeRefreshTokenByID(ctx, pgID)
}
