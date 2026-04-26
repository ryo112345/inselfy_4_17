package sqlc

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/jobposting"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type JobPostingRepository struct {
	queries *generated.Queries
}

var _ port.JobPostingRepository = (*JobPostingRepository)(nil)

func NewJobPostingRepository(pool *pgxpool.Pool) *JobPostingRepository {
	return &JobPostingRepository{queries: generated.New(pool)}
}

func (r *JobPostingRepository) Create(ctx context.Context, j *jobposting.JobPosting) (*jobposting.JobPosting, error) {
	q := queriesForContext(ctx, r.queries)
	companyID, err := parseUUID(j.CompanyID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.CreateJobPosting(ctx, &generated.CreateJobPostingParams{
		CompanyID:      companyID,
		Title:          j.Title,
		Description:    j.Description,
		EmploymentType: j.EmploymentType,
		Location:       pgText(j.Location),
	})
	if err != nil {
		return nil, err
	}
	return jobPostingToDomain(row), nil
}

func (r *JobPostingRepository) GetByID(ctx context.Context, id string) (*jobposting.JobPosting, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return nil, domainerr.ErrNotFound
	}
	row, err := q.GetJobPostingByID(ctx, pgID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	return jobPostingToDomain(row), nil
}

func (r *JobPostingRepository) ListByCompanyID(ctx context.Context, companyID string) ([]*jobposting.JobPosting, error) {
	q := queriesForContext(ctx, r.queries)
	pgCompanyID, err := parseUUID(companyID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	rows, err := q.ListJobPostingsByCompanyID(ctx, pgCompanyID)
	if err != nil {
		return nil, err
	}
	postings := make([]*jobposting.JobPosting, len(rows))
	for i, row := range rows {
		postings[i] = jobPostingToDomain(row)
	}
	return postings, nil
}

func (r *JobPostingRepository) Update(ctx context.Context, j *jobposting.JobPosting) (*jobposting.JobPosting, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(j.ID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.UpdateJobPosting(ctx, &generated.UpdateJobPostingParams{
		ID:             pgID,
		Title:          j.Title,
		Description:    j.Description,
		EmploymentType: j.EmploymentType,
		Location:       pgText(j.Location),
		IsActive:       j.IsActive,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	return jobPostingToDomain(row), nil
}

func (r *JobPostingRepository) Delete(ctx context.Context, id string) error {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return domainerr.ErrNotFound
	}
	return q.DeleteJobPosting(ctx, pgID)
}

func jobPostingToDomain(row *generated.JobPosting) *jobposting.JobPosting {
	return &jobposting.JobPosting{
		ID:             uuidToString(row.ID),
		CompanyID:      uuidToString(row.CompanyID),
		Title:          row.Title,
		Description:    row.Description,
		EmploymentType: row.EmploymentType,
		Location:       textPtr(row.Location),
		IsActive:       row.IsActive,
		CreatedAt:      row.CreatedAt.Time,
		UpdatedAt:      row.UpdatedAt.Time,
	}
}
