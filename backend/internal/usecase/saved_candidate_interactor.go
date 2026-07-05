package usecase

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/talentsearch"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// SavedCandidateInteractor implements port.SavedCandidateInputPort.
type SavedCandidateInteractor struct {
	repo  port.SavedCandidateRepository
	query port.SavedCandidateQueryService
}

var _ port.SavedCandidateInputPort = (*SavedCandidateInteractor)(nil)

func NewSavedCandidateInteractor(repo port.SavedCandidateRepository, query port.SavedCandidateQueryService) *SavedCandidateInteractor {
	return &SavedCandidateInteractor{repo: repo, query: query}
}

func (i *SavedCandidateInteractor) Save(ctx context.Context, companyID, userID string) error {
	return i.repo.Save(ctx, companyID, userID)
}

func (i *SavedCandidateInteractor) Unsave(ctx context.Context, companyID, userID string) error {
	return i.repo.Delete(ctx, companyID, userID)
}

func (i *SavedCandidateInteractor) List(ctx context.Context, companyID string, limit, offset int) ([]talentsearch.Card, int, error) {
	return i.query.ListCards(ctx, companyID, limit, offset)
}

func (i *SavedCandidateInteractor) IsSaved(ctx context.Context, companyID, userID string) (bool, error) {
	return i.repo.Exists(ctx, companyID, userID)
}

func (i *SavedCandidateInteractor) SavedSet(ctx context.Context, companyID string, userIDs []string) (map[string]bool, error) {
	return i.repo.SavedSet(ctx, companyID, userIDs)
}

func (i *SavedCandidateInteractor) Count(ctx context.Context, companyID string) (int, error) {
	return i.repo.Count(ctx, companyID)
}
