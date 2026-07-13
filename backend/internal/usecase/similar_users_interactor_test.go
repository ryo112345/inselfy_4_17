package usecase_test

import (
	"context"
	"errors"
	"testing"

	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/workvalues"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

type similarUsersQueryStub struct {
	latestMu    func(ctx context.Context, userID string) (map[string]float64, error)
	listUsers   func(ctx context.Context, excludeUserID string) ([]workvalues.UserWithMu, error)
	experiences func(ctx context.Context, userIDs []string) (map[string][]workvalues.SimilarUserExperience, error)
}

func (s *similarUsersQueryStub) LatestMu(ctx context.Context, userID string) (map[string]float64, error) {
	return s.latestMu(ctx, userID)
}

func (s *similarUsersQueryStub) ListPublicUsersWithMu(ctx context.Context, excludeUserID string) ([]workvalues.UserWithMu, error) {
	return s.listUsers(ctx, excludeUserID)
}

func (s *similarUsersQueryStub) RecentExperiences(ctx context.Context, userIDs []string) (map[string][]workvalues.SimilarUserExperience, error) {
	return s.experiences(ctx, userIDs)
}

func muOf(pairs map[string]float64) map[string]float64 { return pairs }

func TestSimilarUsersInteractor_NoWorkValues(t *testing.T) {
	stub := &similarUsersQueryStub{
		latestMu: func(context.Context, string) (map[string]float64, error) {
			return nil, errors.New("no rows")
		},
	}
	itr := usecase.NewSimilarUsersInteractor(stub)

	_, err := itr.GetSimilarUsers(context.Background(), "u0", 10)
	if !errors.Is(err, domainerr.ErrNotFound) {
		t.Fatalf("want ErrNotFound, got %v", err)
	}
}

func TestSimilarUsersInteractor_FilterSortLimit(t *testing.T) {
	target := muOf(map[string]float64{"ability_utilization": 1})
	candidates := []workvalues.UserWithMu{
		// cos=1 → sim 1.0 → 100
		{UserID: "u1", Mu: muOf(map[string]float64{"ability_utilization": 2})},
		// orthogonal → sim 0.5 → kept (boundary), score 50
		{UserID: "u2", Mu: muOf(map[string]float64{"achievement": 1})},
		// opposite → sim 0 → filtered
		{UserID: "u3", Mu: muOf(map[string]float64{"ability_utilization": -1})},
		// mixed → cos=√2/2 → sim ≈0.854 → 85.4
		{UserID: "u4", Mu: muOf(map[string]float64{"ability_utilization": 1, "achievement": 1})},
	}
	stub := &similarUsersQueryStub{
		latestMu: func(context.Context, string) (map[string]float64, error) { return target, nil },
		listUsers: func(context.Context, string) ([]workvalues.UserWithMu, error) {
			return candidates, nil
		},
		experiences: func(_ context.Context, ids []string) (map[string][]workvalues.SimilarUserExperience, error) {
			return map[string][]workvalues.SimilarUserExperience{
				"u1": {{CompanyName: "Acme", Title: "Dev", IsCurrent: true}},
			}, nil
		},
	}
	itr := usecase.NewSimilarUsersInteractor(stub)

	got, err := itr.GetSimilarUsers(context.Background(), "u0", 2)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got) != 2 {
		t.Fatalf("want 2 users after limit, got %d", len(got))
	}
	if got[0].UserID != "u1" || got[1].UserID != "u4" {
		t.Fatalf("want sorted [u1 u4], got [%s %s]", got[0].UserID, got[1].UserID)
	}
	if got[0].Similarity != 100 {
		t.Fatalf("want similarity 100, got %v", got[0].Similarity)
	}
	if got[1].Similarity != 85.4 {
		t.Fatalf("want similarity 85.4, got %v", got[1].Similarity)
	}
	// u1's top need labels come from its own mu vector
	if len(got[0].TopNeeds) != 1 || got[0].TopNeeds[0] != "能力活用" {
		t.Fatalf("want top needs [能力活用], got %v", got[0].TopNeeds)
	}
	// experiences attached for u1, empty (not nil) for u4
	if len(got[0].Experiences) != 1 || got[0].Experiences[0].CompanyName != "Acme" {
		t.Fatalf("want u1 experiences attached, got %v", got[0].Experiences)
	}
	if got[1].Experiences == nil || len(got[1].Experiences) != 0 {
		t.Fatalf("want u4 empty experiences, got %v", got[1].Experiences)
	}
}

func TestSimilarUsersInteractor_ExperienceErrorDegrades(t *testing.T) {
	target := muOf(map[string]float64{"ability_utilization": 1})
	stub := &similarUsersQueryStub{
		latestMu: func(context.Context, string) (map[string]float64, error) { return target, nil },
		listUsers: func(context.Context, string) ([]workvalues.UserWithMu, error) {
			return []workvalues.UserWithMu{{UserID: "u1", Mu: target}}, nil
		},
		experiences: func(context.Context, []string) (map[string][]workvalues.SimilarUserExperience, error) {
			return nil, errors.New("db down")
		},
	}
	itr := usecase.NewSimilarUsersInteractor(stub)

	got, err := itr.GetSimilarUsers(context.Background(), "u0", 10)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got[0].Experiences != nil {
		t.Fatalf("want nil experiences on lookup failure, got %v", got[0].Experiences)
	}
}
