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
	output      port.WorkValuesOutputPort
}

var _ port.WorkValuesInputPort = (*WorkValuesInteractor)(nil)

func NewWorkValuesInteractor(
	sessionRepo port.WorkValuesSessionRepository,
	resultRepo port.WorkValuesResultRepository,
	scoreRepo port.WorkValuesScoreRepository,
	output port.WorkValuesOutputPort,
) *WorkValuesInteractor {
	return &WorkValuesInteractor{
		sessionRepo: sessionRepo,
		resultRepo:  resultRepo,
		scoreRepo:   scoreRepo,
		output:      output,
	}
}

func (i *WorkValuesInteractor) StartSession(ctx context.Context, userID string) error {
	seed := uint64(time.Now().UnixNano())
	rng := rand.New(rand.NewPCG(seed, 0))
	pairs := workvalues.GenerateInitialPairs(rng)

	session := &workvalues.Session{
		UserID:       userID,
		Status:       workvalues.StatusInProgress,
		InitialPairs: pairs,
	}

	created, err := i.sessionRepo.Create(ctx, session)
	if err != nil {
		return err
	}

	return i.output.PresentSession(ctx, created)
}

func (i *WorkValuesInteractor) SubmitResult(ctx context.Context, sessionID string, input workvalues.SubmitInput) error {
	session, err := i.sessionRepo.GetByID(ctx, sessionID)
	if err != nil {
		return err
	}

	result, err := workvalues.ValidateAndVerify(session, input)
	if err != nil {
		return err
	}

	created, err := i.resultRepo.Create(ctx, result)
	if err != nil {
		return err
	}

	values := workvalues.AggregateValues(created.Mu)
	if err := i.scoreRepo.Save(ctx, sessionID, values); err != nil {
		return err
	}
	created.Values = values

	if err := i.sessionRepo.UpdateStatus(ctx, sessionID, workvalues.StatusCompleted); err != nil {
		return err
	}

	return i.output.PresentResult(ctx, created)
}

func (i *WorkValuesInteractor) GetLatestResult(ctx context.Context, userID string) error {
	result, err := i.resultRepo.GetLatestByUserID(ctx, userID)
	if err != nil {
		return err
	}

	values, err := i.scoreRepo.GetBySessionID(ctx, result.SessionID)
	if err != nil {
		return err
	}
	result.Values = values

	return i.output.PresentResult(ctx, result)
}

func (i *WorkValuesInteractor) GetResultBySessionID(ctx context.Context, sessionID string) error {
	result, err := i.resultRepo.GetBySessionID(ctx, sessionID)
	if err != nil {
		return err
	}

	values, err := i.scoreRepo.GetBySessionID(ctx, sessionID)
	if err != nil {
		return err
	}
	result.Values = values

	return i.output.PresentResult(ctx, result)
}
