package usecase

import (
	"context"
	"errors"
	"math/rand/v2"
	"time"

	"github.com/akiyama/inselfy/backend/internal/domain/careerinterest"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type CareerInterestInteractor struct {
	sessionRepo    port.CareerInterestSessionRepository
	resultRepo     port.CareerInterestResultRepository
	basicScoreRepo port.CareerInterestBasicScoreRepository
	typeScoreRepo  port.CareerInterestTypeScoreRepository
	reportQS       port.CareerInterestReportQueryService
}

var _ port.CareerInterestInputPort = (*CareerInterestInteractor)(nil)

func NewCareerInterestInteractor(
	sessionRepo port.CareerInterestSessionRepository,
	resultRepo port.CareerInterestResultRepository,
	basicScoreRepo port.CareerInterestBasicScoreRepository,
	typeScoreRepo port.CareerInterestTypeScoreRepository,
	reportQS port.CareerInterestReportQueryService,
) *CareerInterestInteractor {
	return &CareerInterestInteractor{
		sessionRepo:    sessionRepo,
		resultRepo:     resultRepo,
		basicScoreRepo: basicScoreRepo,
		typeScoreRepo:  typeScoreRepo,
		reportQS:       reportQS,
	}
}

func (i *CareerInterestInteractor) StartSession(ctx context.Context, userID string) (*careerinterest.Session, error) {
	seed := uint64(time.Now().UnixNano())
	rng := rand.New(rand.NewPCG(seed, 0))
	items := careerinterest.GenerateItems(rng)

	session := &careerinterest.Session{
		UserID: userID,
		Status: careerinterest.StatusInProgress,
		Items:  items,
	}

	return i.sessionRepo.Create(ctx, session)
}

func (i *CareerInterestInteractor) SubmitResult(ctx context.Context, sessionID, userID string, input careerinterest.SubmitInput) (*careerinterest.Result, error) {
	session, err := i.sessionRepo.GetByID(ctx, sessionID)
	if err != nil {
		return nil, err
	}
	if session.UserID != userID {
		return nil, port.ErrForbidden
	}

	result, err := careerinterest.ValidateAndCompute(session, input)
	if err != nil {
		return nil, err
	}

	created, err := i.resultRepo.Create(ctx, result)
	if err != nil {
		return nil, err
	}

	if err := i.basicScoreRepo.Save(ctx, sessionID, created.BasicScores); err != nil {
		return nil, err
	}
	if err := i.typeScoreRepo.Save(ctx, sessionID, created.TypeScores); err != nil {
		return nil, err
	}

	if err := i.sessionRepo.UpdateStatus(ctx, sessionID, careerinterest.StatusCompleted); err != nil {
		return nil, err
	}

	return created, nil
}

func (i *CareerInterestInteractor) GetLatestResult(ctx context.Context, userID string) (*careerinterest.Result, error) {
	result, err := i.resultRepo.GetLatestByUserID(ctx, userID)
	if err != nil && !errors.Is(err, domainerr.ErrNotFound) {
		return nil, err
	}

	var sessionID string
	if result != nil {
		sessionID = result.SessionID
	} else {
		session, sessErr := i.sessionRepo.GetLatestCompletedByUserID(ctx, userID)
		if sessErr != nil {
			return nil, sessErr
		}
		sessionID = session.ID
		result = &careerinterest.Result{
			SessionID: sessionID,
			UserID:    userID,
			CreatedAt: session.CreatedAt,
		}
	}

	basicScores, err := i.basicScoreRepo.GetBySessionID(ctx, sessionID)
	if err != nil {
		return nil, err
	}
	typeScores, err := i.typeScoreRepo.GetBySessionID(ctx, sessionID)
	if err != nil {
		return nil, err
	}
	result.BasicScores = basicScores
	result.TypeScores = typeScores

	hasReport, err := i.reportQS.ExistsBySessionID(ctx, sessionID)
	if err != nil {
		return nil, err
	}
	result.HasReport = hasReport

	requested, err := i.reportQS.RequestedBySessionID(ctx, sessionID)
	if err != nil {
		return nil, err
	}
	result.ReportRequested = requested

	return result, nil
}

func (i *CareerInterestInteractor) GetResultBySessionID(ctx context.Context, sessionID string) (*careerinterest.Result, error) {
	result, err := i.resultRepo.GetBySessionID(ctx, sessionID)
	if err != nil {
		return nil, err
	}

	basicScores, err := i.basicScoreRepo.GetBySessionID(ctx, result.SessionID)
	if err != nil {
		return nil, err
	}
	typeScores, err := i.typeScoreRepo.GetBySessionID(ctx, result.SessionID)
	if err != nil {
		return nil, err
	}
	result.BasicScores = basicScores
	result.TypeScores = typeScores

	hasReport, err := i.reportQS.ExistsBySessionID(ctx, result.SessionID)
	if err != nil {
		return nil, err
	}
	result.HasReport = hasReport

	requested, err := i.reportQS.RequestedBySessionID(ctx, result.SessionID)
	if err != nil {
		return nil, err
	}
	result.ReportRequested = requested

	return result, nil
}

// RequestAiReport はセッション所有者からの AI レポート作成依頼を記録する（冪等）。
func (i *CareerInterestInteractor) RequestAiReport(ctx context.Context, sessionID, userID string) error {
	session, err := i.sessionRepo.GetByID(ctx, sessionID)
	if err != nil {
		return err
	}
	if session.UserID != userID {
		return port.ErrForbidden
	}
	return i.sessionRepo.RequestReport(ctx, sessionID)
}
