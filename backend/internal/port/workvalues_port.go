package port

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/workvalues"
)

type WorkValuesInputPort interface {
	StartSession(ctx context.Context, userID string) (*workvalues.Session, error)
	SubmitResult(ctx context.Context, sessionID string, input workvalues.SubmitInput) (*workvalues.Result, error)
	GetLatestResult(ctx context.Context, userID string) (*workvalues.Result, error)
	GetResultBySessionID(ctx context.Context, sessionID string) (*workvalues.Result, error)
}

type WorkValuesSessionRepository interface {
	Create(ctx context.Context, s *workvalues.Session) (*workvalues.Session, error)
	GetByID(ctx context.Context, id string) (*workvalues.Session, error)
	UpdateStatus(ctx context.Context, id, status string) error
}

type WorkValuesResultRepository interface {
	Create(ctx context.Context, r *workvalues.Result) (*workvalues.Result, error)
	GetLatestByUserID(ctx context.Context, userID string) (*workvalues.Result, error)
	GetBySessionID(ctx context.Context, sessionID string) (*workvalues.Result, error)
}

type WorkValuesScoreRepository interface {
	Save(ctx context.Context, sessionID string, scores []workvalues.ValueScore) error
	GetBySessionID(ctx context.Context, sessionID string) ([]workvalues.ValueScore, error)
}
