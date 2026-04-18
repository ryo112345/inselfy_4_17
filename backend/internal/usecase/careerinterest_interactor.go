package usecase

import (
	"context"
	"math/rand/v2"
	"time"

	"github.com/akiyama/inselfy/backend/internal/domain/careerinterest"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type CareerInterestInteractor struct {
	sessionRepo    port.CareerInterestSessionRepository
	resultRepo     port.CareerInterestResultRepository
	basicScoreRepo port.CareerInterestBasicScoreRepository
	typeScoreRepo  port.CareerInterestTypeScoreRepository
	output         port.CareerInterestOutputPort
}

var _ port.CareerInterestInputPort = (*CareerInterestInteractor)(nil)

func NewCareerInterestInteractor(
	sessionRepo port.CareerInterestSessionRepository,
	resultRepo port.CareerInterestResultRepository,
	basicScoreRepo port.CareerInterestBasicScoreRepository,
	typeScoreRepo port.CareerInterestTypeScoreRepository,
	output port.CareerInterestOutputPort,
) *CareerInterestInteractor {
	return &CareerInterestInteractor{
		sessionRepo:    sessionRepo,
		resultRepo:     resultRepo,
		basicScoreRepo: basicScoreRepo,
		typeScoreRepo:  typeScoreRepo,
		output:         output,
	}
}

func (i *CareerInterestInteractor) StartSession(ctx context.Context, userID string) error {
	seed := uint64(time.Now().UnixNano())
	rng := rand.New(rand.NewPCG(seed, 0))
	items := careerinterest.GenerateItems(rng)

	session := &careerinterest.Session{
		UserID: userID,
		Status: careerinterest.StatusInProgress,
		Items:  items,
	}

	created, err := i.sessionRepo.Create(ctx, session)
	if err != nil {
		return err
	}

	return i.output.PresentSession(ctx, created)
}

func (i *CareerInterestInteractor) SubmitResult(ctx context.Context, sessionID string, input careerinterest.SubmitInput) error {
	session, err := i.sessionRepo.GetByID(ctx, sessionID)
	if err != nil {
		return err
	}

	result, err := careerinterest.ValidateAndCompute(session, input)
	if err != nil {
		return err
	}

	created, err := i.resultRepo.Create(ctx, result)
	if err != nil {
		return err
	}

	if err := i.basicScoreRepo.Save(ctx, sessionID, created.BasicScores); err != nil {
		return err
	}
	if err := i.typeScoreRepo.Save(ctx, sessionID, created.TypeScores); err != nil {
		return err
	}

	if err := i.sessionRepo.UpdateStatus(ctx, sessionID, careerinterest.StatusCompleted); err != nil {
		return err
	}

	return i.output.PresentResult(ctx, created)
}

func (i *CareerInterestInteractor) GetLatestResult(ctx context.Context, userID string) error {
	result, err := i.resultRepo.GetLatestByUserID(ctx, userID)
	if err != nil {
		return err
	}

	basicScores, err := i.basicScoreRepo.GetBySessionID(ctx, result.SessionID)
	if err != nil {
		return err
	}
	typeScores, err := i.typeScoreRepo.GetBySessionID(ctx, result.SessionID)
	if err != nil {
		return err
	}
	result.BasicScores = basicScores
	result.TypeScores = typeScores

	return i.output.PresentResult(ctx, result)
}

func (i *CareerInterestInteractor) GetResultBySessionID(ctx context.Context, sessionID string) error {
	result, err := i.resultRepo.GetBySessionID(ctx, sessionID)
	if err != nil {
		return err
	}

	basicScores, err := i.basicScoreRepo.GetBySessionID(ctx, result.SessionID)
	if err != nil {
		return err
	}
	typeScores, err := i.typeScoreRepo.GetBySessionID(ctx, result.SessionID)
	if err != nil {
		return err
	}
	result.BasicScores = basicScores
	result.TypeScores = typeScores

	return i.output.PresentResult(ctx, result)
}
