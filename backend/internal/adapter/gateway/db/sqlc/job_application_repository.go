package sqlc

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/jobapplication"
	"github.com/akiyama/inselfy/backend/internal/pkg/cast"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type JobApplicationRepository struct {
	pool    *pgxpool.Pool
	queries *generated.Queries
}

var _ port.JobApplicationRepository = (*JobApplicationRepository)(nil)

func NewJobApplicationRepository(pool *pgxpool.Pool) *JobApplicationRepository {
	return &JobApplicationRepository{pool: pool, queries: generated.New(pool)}
}

func (r *JobApplicationRepository) Create(ctx context.Context, a *jobapplication.JobApplication) (*jobapplication.JobApplication, error) {
	q := queriesForContext(ctx, r.queries)
	jobPostingID, err := parseUUID(a.JobPostingID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	candidateID, err := parseUUID(a.CandidateID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	companyID, err := parseUUID(a.CompanyID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}

	row, err := q.CreateJobApplication(ctx, &generated.CreateJobApplicationParams{
		JobPostingID: jobPostingID,
		CandidateID:  candidateID,
		CompanyID:    companyID,
		Status:       string(a.Status),
		Message:      a.Message,
	})
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, jobapplication.ErrAlreadyApplied
		}
		return nil, err
	}
	return rowToJobApplication(row), nil
}

func (r *JobApplicationRepository) GetByID(ctx context.Context, id string) (*jobapplication.JobApplicationWithDetails, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return nil, domainerr.ErrNotFound
	}
	row, err := q.GetJobApplicationByID(ctx, pgID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	return detailRowToDomain(row), nil
}

func (r *JobApplicationRepository) GetByCandidateAndJob(ctx context.Context, candidateID, jobPostingID string) (*jobapplication.JobApplication, error) {
	q := queriesForContext(ctx, r.queries)
	cID, err := parseUUID(candidateID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	jID, err := parseUUID(jobPostingID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.GetJobApplicationByCandidateAndJob(ctx, &generated.GetJobApplicationByCandidateAndJobParams{
		CandidateID:  cID,
		JobPostingID: jID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	return rowToJobApplication(row), nil
}

func (r *JobApplicationRepository) ListByCompanyID(ctx context.Context, companyID string, filter jobapplication.ListFilter) ([]*jobapplication.JobApplicationWithDetails, int, error) {
	q := queriesForContext(ctx, r.queries)
	pgCompanyID, err := parseUUID(companyID)
	if err != nil {
		return nil, 0, domainerr.ErrBadRequest
	}
	limit := filter.Limit
	if limit <= 0 || limit > 50 {
		limit = 50
	}

	statusFilter := pgtype.Text{}
	if filter.Status != nil {
		statusFilter = pgtype.Text{String: *filter.Status, Valid: true}
	}
	jobPostingFilter := pgtype.UUID{}
	if filter.JobPostingID != nil {
		jpID, err := parseUUID(*filter.JobPostingID)
		if err == nil {
			jobPostingFilter = jpID
		}
	}
	keywordFilter := pgtype.Text{}
	if filter.Keyword != nil {
		keywordFilter = pgtype.Text{String: *filter.Keyword, Valid: true}
	}
	dateFromFilter := pgtype.Timestamptz{}
	if filter.DateFrom != nil {
		dateFromFilter = pgtype.Timestamptz{Time: *filter.DateFrom, Valid: true}
	}
	dateToFilter := pgtype.Timestamptz{}
	if filter.DateTo != nil {
		dateToFilter = pgtype.Timestamptz{Time: *filter.DateTo, Valid: true}
	}

	rows, err := q.ListJobApplicationsByCompanyID(ctx, &generated.ListJobApplicationsByCompanyIDParams{
		CompanyID:    pgCompanyID,
		Limit:        cast.Int32(limit),
		Offset:       cast.Int32(filter.Offset),
		Status:       statusFilter,
		JobPostingID: jobPostingFilter,
		Keyword:      keywordFilter,
		DateFrom:     dateFromFilter,
		DateTo:       dateToFilter,
	})
	if err != nil {
		return nil, 0, err
	}

	count, err := q.CountJobApplicationsByCompanyID(ctx, &generated.CountJobApplicationsByCompanyIDParams{
		CompanyID:    pgCompanyID,
		Status:       statusFilter,
		JobPostingID: jobPostingFilter,
		Keyword:      keywordFilter,
		DateFrom:     dateFromFilter,
		DateTo:       dateToFilter,
	})
	if err != nil {
		return nil, 0, err
	}

	apps := make([]*jobapplication.JobApplicationWithDetails, len(rows))
	for i, row := range rows {
		apps[i] = companyListRowToDomain(row)
	}
	return apps, int(count), nil
}

func (r *JobApplicationRepository) ListByCandidateID(ctx context.Context, candidateID string) ([]*jobapplication.JobApplicationWithDetails, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(candidateID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	rows, err := q.ListJobApplicationsByCandidateID(ctx, pgID)
	if err != nil {
		return nil, err
	}
	apps := make([]*jobapplication.JobApplicationWithDetails, len(rows))
	for i, row := range rows {
		apps[i] = candidateListRowToDomain(row)
	}
	return apps, nil
}

func (r *JobApplicationRepository) UpdateStatus(ctx context.Context, id string, status jobapplication.Status) error {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return domainerr.ErrNotFound
	}
	return q.UpdateJobApplicationStatus(ctx, &generated.UpdateJobApplicationStatusParams{
		ID:     pgID,
		Status: string(status),
	})
}

func rowToJobApplication(row *generated.JobApplication) *jobapplication.JobApplication {
	return &jobapplication.JobApplication{
		ID:           uuidToString(row.ID),
		JobPostingID: uuidToString(row.JobPostingID),
		CandidateID:  uuidToString(row.CandidateID),
		CompanyID:    uuidToString(row.CompanyID),
		Status:       jobapplication.Status(row.Status),
		Message:      row.Message,
		CreatedAt:    row.CreatedAt.Time,
		UpdatedAt:    row.UpdatedAt.Time,
	}
}

func detailRowToDomain(row *generated.GetJobApplicationByIDRow) *jobapplication.JobApplicationWithDetails {
	return &jobapplication.JobApplicationWithDetails{
		JobApplication: jobapplication.JobApplication{
			ID:           uuidToString(row.ID),
			JobPostingID: uuidToString(row.JobPostingID),
			CandidateID:  uuidToString(row.CandidateID),
			CompanyID:    uuidToString(row.CompanyID),
			Status:       jobapplication.Status(row.Status),
			Message:      row.Message,
			CreatedAt:    row.CreatedAt.Time,
			UpdatedAt:    row.UpdatedAt.Time,
		},
		JobTitle:          row.JobTitle,
		CompanyName:       row.CompanyName,
		CandidateName:     row.CandidateName,
		CandidateAvatar:   row.CandidateAvatar,
		CandidateUsername: row.CandidateUsername,
		CandidateHeadline: row.CandidateHeadline,
	}
}

func companyListRowToDomain(row *generated.ListJobApplicationsByCompanyIDRow) *jobapplication.JobApplicationWithDetails {
	var skills []string
	if arr, ok := row.CandidateSkills.([]interface{}); ok {
		for _, v := range arr {
			if s, ok := v.(string); ok {
				skills = append(skills, s)
			}
		}
	}
	return &jobapplication.JobApplicationWithDetails{
		JobApplication: jobapplication.JobApplication{
			ID:           uuidToString(row.ID),
			JobPostingID: uuidToString(row.JobPostingID),
			CandidateID:  uuidToString(row.CandidateID),
			CompanyID:    uuidToString(row.CompanyID),
			Status:       jobapplication.Status(row.Status),
			Message:      row.Message,
			CreatedAt:    row.CreatedAt.Time,
			UpdatedAt:    row.UpdatedAt.Time,
		},
		JobTitle:               row.JobTitle,
		CompanyName:            row.CompanyName,
		CandidateName:          row.CandidateName,
		CandidateAvatar:        row.CandidateAvatar,
		CandidateUsername:      row.CandidateUsername,
		CandidateHeadline:      row.CandidateHeadline,
		CandidateProfileColor:  row.CandidateProfileColor,
		CandidateSeekingStatus: row.CandidateSeekingStatus,
		CandidateSkills:        skills,
	}
}

func candidateListRowToDomain(row *generated.ListJobApplicationsByCandidateIDRow) *jobapplication.JobApplicationWithDetails {
	return &jobapplication.JobApplicationWithDetails{
		JobApplication: jobapplication.JobApplication{
			ID:           uuidToString(row.ID),
			JobPostingID: uuidToString(row.JobPostingID),
			CandidateID:  uuidToString(row.CandidateID),
			CompanyID:    uuidToString(row.CompanyID),
			Status:       jobapplication.Status(row.Status),
			Message:      row.Message,
			CreatedAt:    row.CreatedAt.Time,
			UpdatedAt:    row.UpdatedAt.Time,
		},
		JobTitle:          row.JobTitle,
		CompanyName:       row.CompanyName,
		CandidateName:     row.CandidateName,
		CandidateAvatar:   row.CandidateAvatar,
		CandidateUsername: row.CandidateUsername,
		CandidateHeadline: row.CandidateHeadline,
	}
}
