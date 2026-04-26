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

type ScoutTemplateRepository struct {
	queries *generated.Queries
}

var _ port.ScoutTemplateRepository = (*ScoutTemplateRepository)(nil)

func NewScoutTemplateRepository(pool *pgxpool.Pool) *ScoutTemplateRepository {
	return &ScoutTemplateRepository{queries: generated.New(pool)}
}

func (r *ScoutTemplateRepository) Create(ctx context.Context, t *scout.ScoutTemplate) (*scout.ScoutTemplate, error) {
	q := queriesForContext(ctx, r.queries)
	companyID, err := parseUUID(t.CompanyID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.CreateScoutTemplate(ctx, &generated.CreateScoutTemplateParams{
		CompanyID: companyID,
		Name:      t.Name,
		Subject:   t.Subject,
		Body:      t.Body,
	})
	if err != nil {
		return nil, err
	}
	return scoutTemplateToDomain(row), nil
}

func (r *ScoutTemplateRepository) GetByID(ctx context.Context, id string) (*scout.ScoutTemplate, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return nil, domainerr.ErrNotFound
	}
	row, err := q.GetScoutTemplateByID(ctx, pgID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	return scoutTemplateToDomain(row), nil
}

func (r *ScoutTemplateRepository) Update(ctx context.Context, t *scout.ScoutTemplate) (*scout.ScoutTemplate, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(t.ID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.UpdateScoutTemplate(ctx, &generated.UpdateScoutTemplateParams{
		ID:      pgID,
		Name:    t.Name,
		Subject: t.Subject,
		Body:    t.Body,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	return scoutTemplateToDomain(row), nil
}

func (r *ScoutTemplateRepository) Delete(ctx context.Context, id string) error {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return domainerr.ErrNotFound
	}
	return q.DeleteScoutTemplate(ctx, pgID)
}

func (r *ScoutTemplateRepository) ListByCompanyID(ctx context.Context, companyID string) ([]*scout.ScoutTemplate, error) {
	q := queriesForContext(ctx, r.queries)
	pgCompanyID, err := parseUUID(companyID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	rows, err := q.ListScoutTemplatesByCompanyID(ctx, pgCompanyID)
	if err != nil {
		return nil, err
	}
	templates := make([]*scout.ScoutTemplate, len(rows))
	for i, row := range rows {
		templates[i] = scoutTemplateToDomain(row)
	}
	return templates, nil
}

func (r *ScoutTemplateRepository) CountByCompanyID(ctx context.Context, companyID string) (int64, error) {
	q := queriesForContext(ctx, r.queries)
	pgCompanyID, err := parseUUID(companyID)
	if err != nil {
		return 0, domainerr.ErrBadRequest
	}
	return q.CountScoutTemplatesByCompanyID(ctx, pgCompanyID)
}

func scoutTemplateToDomain(row *generated.ScoutTemplate) *scout.ScoutTemplate {
	return &scout.ScoutTemplate{
		ID:        uuidToString(row.ID),
		CompanyID: uuidToString(row.CompanyID),
		Name:      row.Name,
		Subject:   row.Subject,
		Body:      row.Body,
		CreatedAt: row.CreatedAt.Time,
		UpdatedAt: row.UpdatedAt.Time,
	}
}
