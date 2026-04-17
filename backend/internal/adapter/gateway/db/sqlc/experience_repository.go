package sqlc

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/experience"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// ExperienceRepository is a sqlc-backed implementation of port.ExperienceRepository.
type ExperienceRepository struct {
	queries *generated.Queries
}

var _ port.ExperienceRepository = (*ExperienceRepository)(nil)

// NewExperienceRepository creates an ExperienceRepository bound to the pool.
func NewExperienceRepository(pool *pgxpool.Pool) *ExperienceRepository {
	return &ExperienceRepository{queries: generated.New(pool)}
}

func (r *ExperienceRepository) Create(ctx context.Context, e *experience.Experience) (*experience.Experience, error) {
	q := queriesForContext(ctx, r.queries)
	userID, err := parseUUID(e.UserID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.CreateExperience(ctx, &generated.CreateExperienceParams{
		UserID:      userID,
		CompanyName: e.CompanyName,
		Title:       e.Title,
		StartYear:   e.StartYear,
		StartMonth:  e.StartMonth,
		EndYear:     pgInt2(e.EndYear),
		EndMonth:    pgInt2(e.EndMonth),
		IsCurrent:   e.IsCurrent,
		Description: e.Description,
	})
	if err != nil {
		return nil, mapForeignKeyNotFound(err)
	}
	return toDomainExperience(row), nil
}

func (r *ExperienceRepository) Update(ctx context.Context, e *experience.Experience) (*experience.Experience, error) {
	q := queriesForContext(ctx, r.queries)
	id, err := parseUUID(e.ID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.UpdateExperience(ctx, &generated.UpdateExperienceParams{
		ID:          id,
		CompanyName: e.CompanyName,
		Title:       e.Title,
		StartYear:   e.StartYear,
		StartMonth:  e.StartMonth,
		EndYear:     pgInt2(e.EndYear),
		EndMonth:    pgInt2(e.EndMonth),
		IsCurrent:   e.IsCurrent,
		Description: e.Description,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	return toDomainExperience(row), nil
}

func (r *ExperienceRepository) Delete(ctx context.Context, id string) error {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	rows, err := q.DeleteExperience(ctx, pgID)
	if err != nil {
		return err
	}
	if rows == 0 {
		return domainerr.ErrNotFound
	}
	return nil
}

func (r *ExperienceRepository) GetByID(ctx context.Context, id string) (*experience.Experience, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.GetExperienceByID(ctx, pgID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	return toDomainExperience(row), nil
}

func (r *ExperienceRepository) ListByUserID(ctx context.Context, userID string) ([]*experience.Experience, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(userID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	rows, err := q.ListExperiencesByUserID(ctx, pgID)
	if err != nil {
		return nil, err
	}
	out := make([]*experience.Experience, 0, len(rows))
	for _, row := range rows {
		out = append(out, toDomainExperience(row))
	}
	return out, nil
}

func (r *ExperienceRepository) CountByUserID(ctx context.Context, userID string) (int64, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(userID)
	if err != nil {
		return 0, domainerr.ErrBadRequest
	}
	return q.CountExperiencesByUserID(ctx, pgID)
}

func toDomainExperience(row *generated.Experience) *experience.Experience {
	return &experience.Experience{
		ID:          uuidToString(row.ID),
		UserID:      uuidToString(row.UserID),
		CompanyName: row.CompanyName,
		Title:       row.Title,
		StartYear:   row.StartYear,
		StartMonth:  row.StartMonth,
		EndYear:     int2Ptr(row.EndYear),
		EndMonth:    int2Ptr(row.EndMonth),
		IsCurrent:   row.IsCurrent,
		Description: row.Description,
		CreatedAt:   row.CreatedAt.Time,
		UpdatedAt:   row.UpdatedAt.Time,
	}
}
