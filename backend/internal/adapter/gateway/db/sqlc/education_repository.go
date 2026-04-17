package sqlc

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
	"github.com/akiyama/inselfy/backend/internal/domain/education"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// EducationRepository is a sqlc-backed implementation of port.EducationRepository.
type EducationRepository struct {
	queries *generated.Queries
}

var _ port.EducationRepository = (*EducationRepository)(nil)

// NewEducationRepository creates an EducationRepository bound to the pool.
func NewEducationRepository(pool *pgxpool.Pool) *EducationRepository {
	return &EducationRepository{queries: generated.New(pool)}
}

func (r *EducationRepository) Create(ctx context.Context, e *education.Education) (*education.Education, error) {
	q := queriesForContext(ctx, r.queries)
	userID, err := parseUUID(e.UserID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.CreateEducation(ctx, &generated.CreateEducationParams{
		UserID:    userID,
		School:    e.School,
		Degree:    pgText(e.Degree),
		StartYear: pgInt2(e.StartYear),
		EndYear:   pgInt2(e.EndYear),
	})
	if err != nil {
		return nil, mapForeignKeyNotFound(err)
	}
	return toDomainEducation(row), nil
}

func (r *EducationRepository) Update(ctx context.Context, e *education.Education) (*education.Education, error) {
	q := queriesForContext(ctx, r.queries)
	id, err := parseUUID(e.ID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.UpdateEducation(ctx, &generated.UpdateEducationParams{
		ID:        id,
		School:    e.School,
		Degree:    pgText(e.Degree),
		StartYear: pgInt2(e.StartYear),
		EndYear:   pgInt2(e.EndYear),
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	return toDomainEducation(row), nil
}

func (r *EducationRepository) Delete(ctx context.Context, id string) error {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	rows, err := q.DeleteEducation(ctx, pgID)
	if err != nil {
		return err
	}
	if rows == 0 {
		return domainerr.ErrNotFound
	}
	return nil
}

func (r *EducationRepository) GetByID(ctx context.Context, id string) (*education.Education, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.GetEducationByID(ctx, pgID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	return toDomainEducation(row), nil
}

func (r *EducationRepository) ListByUserID(ctx context.Context, userID string) ([]*education.Education, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(userID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	rows, err := q.ListEducationsByUserID(ctx, pgID)
	if err != nil {
		return nil, err
	}
	out := make([]*education.Education, 0, len(rows))
	for _, row := range rows {
		out = append(out, toDomainEducation(row))
	}
	return out, nil
}

func (r *EducationRepository) CountByUserID(ctx context.Context, userID string) (int64, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(userID)
	if err != nil {
		return 0, domainerr.ErrBadRequest
	}
	return q.CountEducationsByUserID(ctx, pgID)
}

func toDomainEducation(row *generated.Education) *education.Education {
	return &education.Education{
		ID:        uuidToString(row.ID),
		UserID:    uuidToString(row.UserID),
		School:    row.School,
		Degree:    textPtr(row.Degree),
		StartYear: int2Ptr(row.StartYear),
		EndYear:   int2Ptr(row.EndYear),
		CreatedAt: row.CreatedAt.Time,
		UpdatedAt: row.UpdatedAt.Time,
	}
}
