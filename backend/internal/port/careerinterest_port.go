package port

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/careerinterest"
)

type CareerInterestInputPort interface {
	StartSession(ctx context.Context, userID string) error
	SubmitResult(ctx context.Context, sessionID string, input careerinterest.SubmitInput) error
	GetLatestResult(ctx context.Context, userID string) error
	GetResultBySessionID(ctx context.Context, sessionID string) error
}

type CareerInterestOutputPort interface {
	PresentSession(ctx context.Context, s *careerinterest.Session) error
	PresentResult(ctx context.Context, r *careerinterest.Result) error
}

type CareerInterestSessionRepository interface {
	Create(ctx context.Context, s *careerinterest.Session) (*careerinterest.Session, error)
	GetByID(ctx context.Context, id string) (*careerinterest.Session, error)
	GetLatestCompletedByUserID(ctx context.Context, userID string) (*careerinterest.Session, error)
	UpdateStatus(ctx context.Context, id, status string) error
}

type CareerInterestResultRepository interface {
	Create(ctx context.Context, r *careerinterest.Result) (*careerinterest.Result, error)
	GetLatestByUserID(ctx context.Context, userID string) (*careerinterest.Result, error)
	GetBySessionID(ctx context.Context, sessionID string) (*careerinterest.Result, error)
}

type CareerInterestBasicScoreRepository interface {
	Save(ctx context.Context, sessionID string, scores []careerinterest.BasicScore) error
	GetBySessionID(ctx context.Context, sessionID string) ([]careerinterest.BasicScore, error)
}

type CareerInterestTypeScoreRepository interface {
	Save(ctx context.Context, sessionID string, scores []careerinterest.TypeScore) error
	GetBySessionID(ctx context.Context, sessionID string) ([]careerinterest.TypeScore, error)
}
