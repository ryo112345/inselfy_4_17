package sqlc

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/resume"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// ResumeRepository is a sqlc-backed implementation of port.ResumeRepository.
type ResumeRepository struct {
	queries *generated.Queries
}

var _ port.ResumeRepository = (*ResumeRepository)(nil)

// NewResumeRepository creates a ResumeRepository bound to the pool.
func NewResumeRepository(pool *pgxpool.Pool) *ResumeRepository {
	return &ResumeRepository{queries: generated.New(pool)}
}

func (r *ResumeRepository) Create(ctx context.Context, userID, originalFilename, storageKey string) (*resume.Upload, error) {
	q := queriesForContext(ctx, r.queries)
	pgUserID, err := parseUUID(userID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.CreateResumeUpload(ctx, &generated.CreateResumeUploadParams{
		UserID:           pgUserID,
		OriginalFilename: originalFilename,
		StorageKey:       storageKey,
	})
	if err != nil {
		// uq_resume_uploads_active_per_user: an active upload already exists.
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return nil, domainerr.ErrConflict
		}
		return nil, mapForeignKeyNotFound(err)
	}
	return toDomainResumeUpload(row), nil
}

func (r *ResumeRepository) GetByID(ctx context.Context, id string) (*resume.Upload, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.GetResumeUploadByID(ctx, pgID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	return toDomainResumeUpload(row), nil
}

func (r *ResumeRepository) GetByIDForUpdate(ctx context.Context, id string) (*resume.Upload, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.GetResumeUploadByIDForUpdate(ctx, pgID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	return toDomainResumeUpload(row), nil
}

func (r *ResumeRepository) GetLatestByUserID(ctx context.Context, userID string) (*resume.Upload, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(userID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.GetLatestResumeUploadByUserID(ctx, pgID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	return toDomainResumeUpload(row), nil
}

func (r *ResumeRepository) Approve(ctx context.Context, id string, adminID *string) (*resume.Upload, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.ApproveResumeUpload(ctx, &generated.ApproveResumeUploadParams{
		ID:         pgID,
		ApprovedBy: optionalUUID(adminID),
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	return toDomainResumeUpload(row), nil
}

func toDomainResumeUpload(row *generated.ResumeUpload) *resume.Upload {
	var approvedBy *string
	if row.ApprovedBy.Valid {
		s := uuidToString(row.ApprovedBy)
		approvedBy = &s
	}
	return &resume.Upload{
		ID:               uuidToString(row.ID),
		UserID:           uuidToString(row.UserID),
		OriginalFilename: row.OriginalFilename,
		StorageKey:       row.StorageKey,
		Status:           resume.Status(row.Status),
		Draft:            row.Draft,
		ApprovedBy:       approvedBy,
		CreatedAt:        row.CreatedAt.Time,
		UpdatedAt:        row.UpdatedAt.Time,
	}
}
