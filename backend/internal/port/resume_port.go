package port

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/resume"
)

// ResumeInputPort defines resume-upload use case input methods used by the
// candidate-facing controller and the admin approve action. Admin list/draft
// reads stay pool-backed in the admin controller (CLAUDE.md exception).
type ResumeInputPort interface {
	// CreateUpload registers an uploaded PDF. Returns domainerr.ErrConflict
	// when the user already has an active (pending/reviewing) upload.
	CreateUpload(ctx context.Context, userID, originalFilename, storageKey string) (*resume.Upload, error)
	// GetMine returns the user's latest upload, or domainerr.ErrNotFound.
	GetMine(ctx context.Context, userID string) (*resume.Upload, error)
	// Approve validates the stored draft, applies it to the user's profile,
	// marks the upload approved and notifies the candidate — atomically.
	// adminID may be empty (bootstrap key) in which case approved_by is null.
	Approve(ctx context.Context, resumeID, adminID string) (*resume.Upload, error)
}

// ResumeRepository abstracts resume-upload persistence.
type ResumeRepository interface {
	Create(ctx context.Context, userID, originalFilename, storageKey string) (*resume.Upload, error)
	GetByID(ctx context.Context, id string) (*resume.Upload, error)
	// GetByIDForUpdate locks the row for the current transaction.
	GetByIDForUpdate(ctx context.Context, id string) (*resume.Upload, error)
	GetLatestByUserID(ctx context.Context, userID string) (*resume.Upload, error)
	// Approve sets status=approved and approved_by (nil adminID → NULL).
	Approve(ctx context.Context, id string, adminID *string) (*resume.Upload, error)
}
