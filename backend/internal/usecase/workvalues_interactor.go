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
	output      port.WorkValuesOutputPort
}

var _ port.WorkValuesInputPort = (*WorkValuesInteractor)(nil)

func NewWorkValuesInteractor(
	sessionRepo port.WorkValuesSessionRepository,
	resultRepo port.WorkValuesResultRepository,
	output port.WorkValuesOutputPort,
) *WorkValuesInteractor {
	return &WorkValuesInteractor{
		sessionRepo: sessionRepo,
		resultRepo:  resultRepo,
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
	return i.output.PresentResult(ctx, result)
}
