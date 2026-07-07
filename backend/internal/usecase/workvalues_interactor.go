package usecase

import (
	"context"
	"math/rand/v2"
	"time"

	"github.com/akiyama/inselfy/backend/internal/domain/workvalues"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type WorkValuesInteractor struct {
	sessionRepo port.WorkValuesSessionRepository
	resultRepo  port.WorkValuesResultRepository
	scoreRepo   port.WorkValuesScoreRepository
}

var _ port.WorkValuesInputPort = (*WorkValuesInteractor)(nil)

func NewWorkValuesInteractor(
	sessionRepo port.WorkValuesSessionRepository,
	resultRepo port.WorkValuesResultRepository,
	scoreRepo port.WorkValuesScoreRepository,
) *WorkValuesInteractor {
	return &WorkValuesInteractor{
		sessionRepo: sessionRepo,
		resultRepo:  resultRepo,
		scoreRepo:   scoreRepo,
	}
}

func (i *WorkValuesInteractor) StartSession(ctx context.Context, userID string) (*workvalues.Session, error) {
	seed := uint64(time.Now().UnixNano())
	rng := rand.New(rand.NewPCG(seed, 0))
	pairs := workvalues.GenerateInitialPairs(rng)

	session := &workvalues.Session{
		UserID:       userID,
		Status:       workvalues.StatusInProgress,
		InitialPairs: pairs,
	}

	return i.sessionRepo.Create(ctx, session)
}

func (i *WorkValuesInteractor) SubmitResult(ctx context.Context, sessionID, userID string, input workvalues.SubmitInput) (*workvalues.Result, error) {
	session, err := i.sessionRepo.GetByID(ctx, sessionID)
	if err != nil {
		return nil, err
	}
	if session.UserID != userID {
		return nil, port.ErrForbidden
	}

	result, err := workvalues.ValidateAndVerify(session, input)
	if err != nil {
		return nil, err
	}

	created, err := i.resultRepo.Create(ctx, result)
	if err != nil {
		return nil, err
	}

	values := workvalues.AggregateValues(created.Mu)
	if err := i.scoreRepo.Save(ctx, sessionID, values); err != nil {
		return nil, err
	}
	created.Values = values

	if err := i.sessionRepo.UpdateStatus(ctx, sessionID, workvalues.StatusCompleted); err != nil {
		return nil, err
	}

	return created, nil
}

func (i *WorkValuesInteractor) GetLatestResult(ctx context.Context, userID string) (*workvalues.Result, error) {
	result, err := i.resultRepo.GetLatestByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	values, err := i.scoreRepo.GetBySessionID(ctx, result.SessionID)
	if err != nil {
		return nil, err
	}
	result.Values = values

	return result, nil
}

func (i *WorkValuesInteractor) GetResultBySessionID(ctx context.Context, sessionID string) (*workvalues.Result, error) {
	result, err := i.resultRepo.GetBySessionID(ctx, sessionID)
	if err != nil {
		return nil, err
	}

	values, err := i.scoreRepo.GetBySessionID(ctx, sessionID)
	if err != nil {
		return nil, err
	}
	result.Values = values

	return result, nil
}
