package sqlc

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
	"github.com/akiyama/inselfy/backend/internal/domain/company"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type CompanyRefreshTokenRepository struct {
	queries *generated.Queries
}

var _ port.CompanyRefreshTokenRepository = (*CompanyRefreshTokenRepository)(nil)

func NewCompanyRefreshTokenRepository(pool *pgxpool.Pool) *CompanyRefreshTokenRepository {
	return &CompanyRefreshTokenRepository{queries: generated.New(pool)}
}

func (r *CompanyRefreshTokenRepository) Create(ctx context.Context, rt *company.CompanyRefreshToken) error {
	q := queriesForContext(ctx, r.queries)
	companyID, err := parseUUID(rt.CompanyID)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	return q.CreateCompanyRefreshToken(ctx, &generated.CreateCompanyRefreshTokenParams{
		CompanyID: companyID,
		TokenHash: rt.TokenHash,
		ExpiresAt: pgtype.Timestamptz{Time: rt.ExpiresAt, Valid: true},
	})
}

func (r *CompanyRefreshTokenRepository) GetByTokenHash(ctx context.Context, tokenHash string) (*company.CompanyRefreshToken, error) {
	q := queriesForContext(ctx, r.queries)
	row, err := q.GetCompanyRefreshTokenByHash(ctx, tokenHash)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	rt := &company.CompanyRefreshToken{
		ID:        uuidToString(row.ID),
		CompanyID: uuidToString(row.CompanyID),
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

func (r *CompanyRefreshTokenRepository) RevokeByCompanyID(ctx context.Context, companyID string) error {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(companyID)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	return q.RevokeCompanyRefreshTokensByCompanyID(ctx, pgID)
}
