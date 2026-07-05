package port

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/talentsearch"
)

// SavedCandidateInputPort defines company saved-candidate use cases.
type SavedCandidateInputPort interface {
	Save(ctx context.Context, companyID, userID string) error
	Unsave(ctx context.Context, companyID, userID string) error
	List(ctx context.Context, companyID string, limit, offset int) ([]talentsearch.Card, int, error)
	IsSaved(ctx context.Context, companyID, userID string) (bool, error)
	SavedSet(ctx context.Context, companyID string, userIDs []string) (map[string]bool, error)
	Count(ctx context.Context, companyID string) (int, error)
}

// SavedCandidateRepository persists saved-candidate bookmarks.
type SavedCandidateRepository interface {
	Save(ctx context.Context, companyID, userID string) error
	Delete(ctx context.Context, companyID, userID string) error
	Exists(ctx context.Context, companyID, userID string) (bool, error)
	SavedSet(ctx context.Context, companyID string, userIDs []string) (map[string]bool, error)
	Count(ctx context.Context, companyID string) (int, error)
}

// SavedCandidateQueryService reads enriched talent cards for saved candidates.
type SavedCandidateQueryService interface {
	ListCards(ctx context.Context, companyID string, limit, offset int) ([]talentsearch.Card, int, error)
}
