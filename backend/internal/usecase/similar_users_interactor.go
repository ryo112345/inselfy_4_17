package usecase

import (
	"context"
	"math"
	"sort"

	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/workvalues"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// SimilarUsersInteractor implements port.SimilarUsersInputPort.
type SimilarUsersInteractor struct {
	query port.SimilarUsersQueryService
}

var _ port.SimilarUsersInputPort = (*SimilarUsersInteractor)(nil)

func NewSimilarUsersInteractor(query port.SimilarUsersQueryService) *SimilarUsersInteractor {
	return &SimilarUsersInteractor{query: query}
}

func (i *SimilarUsersInteractor) GetSimilarUsers(ctx context.Context, userID string, limit int) ([]workvalues.SimilarUser, error) {
	targetMu, err := i.query.LatestMu(ctx, userID)
	if err != nil {
		return nil, domainerr.ErrNotFound
	}

	candidates, err := i.query.ListPublicUsersWithMu(ctx, userID)
	if err != nil {
		return nil, err
	}

	var result []workvalues.SimilarUser
	for _, c := range candidates {
		sim := workvalues.CosineSimilarity(targetMu, c.Mu)
		if sim < 0.5 {
			continue
		}
		result = append(result, workvalues.SimilarUser{
			UserID:       c.UserID,
			Username:     c.Username,
			Name:         c.Name,
			Headline:     c.Headline,
			AvatarURL:    c.AvatarURL,
			ProfileColor: c.ProfileColor,
			Similarity:   math.Round(sim*1000) / 10,
			TopNeeds:     workvalues.NeedLabels(workvalues.TopNeedIDs(c.Mu, 3)),
		})
	}

	sort.Slice(result, func(a, b int) bool {
		return result[a].Similarity > result[b].Similarity
	})

	if len(result) > limit {
		result = result[:limit]
	}

	if len(result) > 0 {
		ids := make([]string, len(result))
		for k, u := range result {
			ids[k] = u.UserID
		}
		// A failed experience lookup degrades the cards instead of failing
		// the request (historical behavior).
		if expMap, err := i.query.RecentExperiences(ctx, ids); err == nil {
			for k := range result {
				if exps, ok := expMap[result[k].UserID]; ok {
					result[k].Experiences = exps
				} else {
					result[k].Experiences = []workvalues.SimilarUserExperience{}
				}
			}
		}
	}

	return result, nil
}
