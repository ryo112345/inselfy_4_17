package port

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/workvalues"
)

type WorkValuesInputPort interface {
	StartSession(ctx context.Context, userID string) error
	SubmitResult(ctx context.Context, sessionID string, input workvalues.SubmitInput) error
	GetLatestResult(ctx context.Context, userID string) error
}

type WorkValuesOutputPort interface {
	PresentSession(ctx context.Context, s *workvalues.Session) error
	PresentResult(ctx context.Context, r *workvalues.Result) error
}

type WorkValuesSessionRepository interface {
	Create(ctx context.Context, s *workvalues.Session) (*workvalues.Session, error)
	GetByID(ctx context.Context, id string) (*workvalues.Session, error)
	UpdateStatus(ctx context.Context, id, status string) error
}

type WorkValuesResultRepository interface {
	Create(ctx context.Context, r *workvalues.Result) (*workvalues.Result, error)
	GetLatestByUserID(ctx context.Context, userID string) (*workvalues.Result, error)
}
