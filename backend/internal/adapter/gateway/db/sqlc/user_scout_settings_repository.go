package sqlc

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/scout"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type UserScoutSettingsRepository struct {
	queries *generated.Queries
}

var _ port.UserScoutSettingsRepository = (*UserScoutSettingsRepository)(nil)

func NewUserScoutSettingsRepository(pool *pgxpool.Pool) *UserScoutSettingsRepository {
	return &UserScoutSettingsRepository{queries: generated.New(pool)}
}

func (r *UserScoutSettingsRepository) GetByUserID(ctx context.Context, userID string) (*scout.UserScoutSettings, error) {
	q := queriesForContext(ctx, r.queries)
	pgUserID, err := parseUUID(userID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.GetUserScoutSettings(ctx, pgUserID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	return userScoutSettingsToDomain(row), nil
}

func (r *UserScoutSettingsRepository) Upsert(ctx context.Context, s *scout.UserScoutSettings) (*scout.UserScoutSettings, error) {
	q := queriesForContext(ctx, r.queries)
	pgUserID, err := parseUUID(s.UserID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.UpsertUserScoutSettings(ctx, &generated.UpsertUserScoutSettingsParams{
		UserID:          pgUserID,
		AcceptingScouts: s.AcceptingScouts,
	})
	if err != nil {
		return nil, err
	}
	return userScoutSettingsToDomain(row), nil
}

func userScoutSettingsToDomain(row *generated.UserScoutSetting) *scout.UserScoutSettings {
	return &scout.UserScoutSettings{
		UserID:          uuidToString(row.UserID),
		AcceptingScouts: row.AcceptingScouts,
		UpdatedAt:       row.UpdatedAt.Time,
	}
}
