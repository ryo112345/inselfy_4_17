package port

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/careerinterest"
)

type CareerInterestInputPort interface {
	StartSession(ctx context.Context, userID string) (*careerinterest.Session, error)
	SubmitResult(ctx context.Context, sessionID, userID string, input careerinterest.SubmitInput) (*careerinterest.Result, error)
	GetLatestResult(ctx context.Context, userID string) (*careerinterest.Result, error)
	GetResultBySessionID(ctx context.Context, sessionID string) (*careerinterest.Result, error)
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

// AIレポート（ci_ai_reports）の存在確認。本文の取得・生成は admin コントローラが担うため、
// ここでは結果レスポンスに載せる存在フラグだけを扱う。
type CareerInterestReportQueryService interface {
	ExistsBySessionID(ctx context.Context, sessionID string) (bool, error)
}
