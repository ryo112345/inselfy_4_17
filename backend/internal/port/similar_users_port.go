package port

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/workvalues"
)

// SimilarUsersInputPort defines the similar-users use case.
type SimilarUsersInputPort interface {
	GetSimilarUsers(ctx context.Context, userID string, limit int) ([]workvalues.SimilarUser, error)
}

// SimilarUsersQueryService reads work-values vectors and card data.
type SimilarUsersQueryService interface {
	LatestMu(ctx context.Context, userID string) (map[string]float64, error)
	ListPublicUsersWithMu(ctx context.Context, excludeUserID string) ([]workvalues.UserWithMu, error)
	RecentExperiences(ctx context.Context, userIDs []string) (map[string][]workvalues.SimilarUserExperience, error)
}
