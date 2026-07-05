package usecase_test

import (
	"context"
	"errors"
	"testing"

	"github.com/akiyama/inselfy/backend/internal/domain/talentsearch"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

// Expected similarity values below are computed independently from the spec:
// per-dimension Gaussian closeness (sigma WV=18, CI=0.7, floor 0.001),
// geometric mean (WV weighted by the user's own scores), ×1000, rounded, /10.

func TestTalentSearchInteractor_Search_Delegates(t *testing.T) {
	want := []talentsearch.Card{{UserID: "u1"}}
	var gotFilter talentsearch.Filter
	stub := &talentSearchQueryStub{
		searchCardsFn: func(_ context.Context, f talentsearch.Filter, limit, offset int) ([]talentsearch.Card, int, error) {
			gotFilter = f
			if limit != 20 || offset != 5 {
				t.Errorf("limit/offset = %d/%d, want 20/5", limit, offset)
			}
			return want, 42, nil
		},
	}
	it := usecase.NewTalentSearchInteractor(stub)

	cards, total, err := it.Search(context.Background(), talentsearch.Filter{Keyword: "go"}, 20, 5)
	if err != nil {
		t.Fatalf("Search: %v", err)
	}
	if total != 42 || len(cards) != 1 || cards[0].UserID != "u1" {
		t.Errorf("got cards=%v total=%d", cards, total)
	}
	if gotFilter.Keyword != "go" {
		t.Errorf("filter not forwarded: %+v", gotFilter)
	}
}

func TestTalentSearchInteractor_DiagnosticSearch_ScoresAndSorts(t *testing.T) {
	target := map[string]float64{"achievement": 80, "comfort": 40}
	stub := &talentSearchQueryStub{
		publicWVFn: func(_ context.Context, filterUserIDs []string) ([]talentsearch.UserWVScores, error) {
			if filterUserIDs != nil {
				t.Errorf("expected nil filter ids, got %v", filterUserIDs)
			}
			return []talentsearch.UserWVScores{
				{UserID: "far", Scores: map[string]float64{"achievement": 50, "comfort": 70}},
				{UserID: "exact", Scores: map[string]float64{"achievement": 80, "comfort": 40}},
			}, nil
		},
	}
	it := usecase.NewTalentSearchInteractor(stub)

	cards, total, err := it.DiagnosticSearch(context.Background(), talentsearch.DiagnosticSearchInput{
		CompanyID: "c1", CustomWV: target, Limit: 20,
	})
	if err != nil {
		t.Fatalf("DiagnosticSearch: %v", err)
	}
	if total != 2 || len(cards) != 2 {
		t.Fatalf("total=%d len=%d, want 2/2", total, len(cards))
	}
	if cards[0].UserID != "exact" || cards[1].UserID != "far" {
		t.Fatalf("order = %s,%s; want exact,far", cards[0].UserID, cards[1].UserID)
	}
	if *cards[0].Similarity != 100.1 || *cards[1].Similarity != 25.0 {
		t.Errorf("similarities = %v,%v; want 100.1,25.0", *cards[0].Similarity, *cards[1].Similarity)
	}
	if *cards[0].WVSimilarity != 100.1 {
		t.Errorf("WVSimilarity = %v, want 100.1", *cards[0].WVSimilarity)
	}
	if cards[0].CISimilarity != nil || cards[0].IntSimilarity != nil {
		t.Errorf("no CI target given: CI/Int similarity should stay nil")
	}
}

func TestTalentSearchInteractor_DiagnosticSearch_Pagination(t *testing.T) {
	stub := &talentSearchQueryStub{
		publicWVFn: func(_ context.Context, _ []string) ([]talentsearch.UserWVScores, error) {
			return []talentsearch.UserWVScores{
				{UserID: "a", Scores: map[string]float64{"achievement": 80}},
				{UserID: "b", Scores: map[string]float64{"achievement": 62}},
				{UserID: "c", Scores: map[string]float64{"achievement": 20}},
			}, nil
		},
	}
	it := usecase.NewTalentSearchInteractor(stub)
	in := talentsearch.DiagnosticSearchInput{CustomWV: map[string]float64{"achievement": 80}}

	in.Limit, in.Offset = 1, 1
	cards, total, err := it.DiagnosticSearch(context.Background(), in)
	if err != nil {
		t.Fatalf("DiagnosticSearch: %v", err)
	}
	if total != 3 || len(cards) != 1 || cards[0].UserID != "b" {
		t.Errorf("page 2 = %v (total %d), want just b (total 3)", cards, total)
	}

	in.Limit, in.Offset = 20, 5
	cards, total, err = it.DiagnosticSearch(context.Background(), in)
	if err != nil {
		t.Fatalf("DiagnosticSearch: %v", err)
	}
	if total != 3 || len(cards) != 0 {
		t.Errorf("offset beyond end: cards=%v total=%d, want empty/3", cards, total)
	}
}

func TestTalentSearchInteractor_DiagnosticSearch_CrossCISimilarity(t *testing.T) {
	ci := [6]float64{4, 3, 0, 0, 0, 0}
	stub := &talentSearchQueryStub{
		publicWVFn: func(_ context.Context, _ []string) ([]talentsearch.UserWVScores, error) {
			return []talentsearch.UserWVScores{
				{UserID: "both", Scores: map[string]float64{"achievement": 80}},
				{UserID: "wvonly", Scores: map[string]float64{"achievement": 80}},
			}, nil
		},
		ciByUserIDsFn: func(_ context.Context, _ []string) (map[string][6]float64, error) {
			return map[string][6]float64{"both": {3, 3, 0, 0, 0, 0}}, nil
		},
	}
	it := usecase.NewTalentSearchInteractor(stub)

	cards, _, err := it.DiagnosticSearch(context.Background(), talentsearch.DiagnosticSearchInput{
		CustomWV: map[string]float64{"achievement": 80}, CustomCI: &ci, Limit: 20,
	})
	if err != nil {
		t.Fatalf("DiagnosticSearch: %v", err)
	}
	byID := map[string]talentsearch.Card{}
	for _, c := range cards {
		byID[c.UserID] = c
	}
	both := byID["both"]
	if both.CISimilarity == nil || *both.CISimilarity != 60.2 {
		t.Fatalf("CISimilarity = %v, want 60.2", both.CISimilarity)
	}
	wantInt := 80.2 // round((100.1+60.2)/2 * 10) / 10
	if both.IntSimilarity == nil || *both.IntSimilarity != wantInt {
		t.Errorf("IntSimilarity = %v, want %v", both.IntSimilarity, wantInt)
	}
	wvonly := byID["wvonly"]
	if wvonly.CISimilarity != nil || wvonly.IntSimilarity != nil {
		t.Errorf("user without CI data must keep nil CI/Int similarity")
	}
}

func TestTalentSearchInteractor_DiagnosticSearch_TargetErrors(t *testing.T) {
	stub := &talentSearchQueryStub{
		teamCompanyIDFn: func(_ context.Context, teamID string) (string, error) {
			if teamID == "missing" {
				return "", errors.New("no rows")
			}
			return "other-company", nil
		},
	}
	it := usecase.NewTalentSearchInteractor(stub)

	for _, tc := range []struct {
		name string
		in   talentsearch.DiagnosticSearchInput
		want error
	}{
		{"team not found", talentsearch.DiagnosticSearchInput{CompanyID: "c1", TeamID: "missing"}, talentsearch.ErrTeamWVUnavailable},
		{"team not owned", talentsearch.DiagnosticSearchInput{CompanyID: "c1", TeamID: "t1"}, talentsearch.ErrTeamWVUnavailable},
		{"no target at all", talentsearch.DiagnosticSearchInput{CompanyID: "c1"}, talentsearch.ErrWVWeightsRequired},
	} {
		if _, _, err := it.DiagnosticSearch(context.Background(), tc.in); !errors.Is(err, tc.want) {
			t.Errorf("%s: err = %v, want %v", tc.name, err, tc.want)
		}
	}
}

func TestTalentSearchInteractor_DiagnosticSearch_FilterNoMatch(t *testing.T) {
	scoringCalled := false
	stub := &talentSearchQueryStub{
		filteredUserIDsFn: func(_ context.Context, _ talentsearch.Filter) ([]string, error) {
			return nil, nil
		},
		publicWVFn: func(_ context.Context, _ []string) ([]talentsearch.UserWVScores, error) {
			scoringCalled = true
			return nil, nil
		},
	}
	it := usecase.NewTalentSearchInteractor(stub)

	// The empty result short-circuits before target validation, so even a
	// request without weights succeeds (historical behavior).
	cards, total, err := it.DiagnosticSearch(context.Background(), talentsearch.DiagnosticSearchInput{
		Filter: talentsearch.Filter{Keyword: "nobody"},
	})
	if err != nil {
		t.Fatalf("DiagnosticSearch: %v", err)
	}
	if total != 0 || len(cards) != 0 {
		t.Errorf("cards=%v total=%d, want empty", cards, total)
	}
	if scoringCalled {
		t.Errorf("scoring must not run when the filter matches nobody")
	}
}

func TestTalentSearchInteractor_CIDiagnosticSearch_ScoresAndCrossWV(t *testing.T) {
	ci := [6]float64{4, 3, 2, 1, 5, 6}
	stub := &talentSearchQueryStub{
		publicCIFn: func(_ context.Context, _ []string) ([]talentsearch.UserCIScores, error) {
			return []talentsearch.UserCIScores{
				{UserID: "off", Scores: [6]float64{1, 0, 0, 0, 0, 0}},
				{UserID: "exact", Scores: [6]float64{4, 3, 2, 1, 5, 6}},
			}, nil
		},
		wvByUserIDsFn: func(_ context.Context, _ []string) (map[string]map[string]float64, error) {
			return map[string]map[string]float64{
				"exact": {"achievement": 62},
			}, nil
		},
	}
	it := usecase.NewTalentSearchInteractor(stub)

	cards, total, err := it.CIDiagnosticSearch(context.Background(), talentsearch.DiagnosticSearchInput{
		CustomCI: &ci, CustomWV: map[string]float64{"achievement": 80}, Limit: 20,
	})
	if err != nil {
		t.Fatalf("CIDiagnosticSearch: %v", err)
	}
	if total != 2 || cards[0].UserID != "exact" {
		t.Fatalf("order/total wrong: %v total=%d", cards, total)
	}
	if *cards[0].Similarity != 100.1 || *cards[0].CISimilarity != 100.1 {
		t.Errorf("CI similarity = %v/%v, want 100.1", *cards[0].Similarity, *cards[0].CISimilarity)
	}
	if cards[0].WVSimilarity == nil || *cards[0].WVSimilarity != 60.8 {
		t.Errorf("cross WVSimilarity = %v, want 60.8", cards[0].WVSimilarity)
	}
	// (100.1+60.8)/2*10 = 804.4999... in float64, so this rounds DOWN to 80.4.
	if cards[0].IntSimilarity == nil || *cards[0].IntSimilarity != 80.4 {
		t.Errorf("IntSimilarity = %v, want 80.4", *cards[0].IntSimilarity)
	}
	if cards[1].WVSimilarity != nil {
		t.Errorf("user without WV data must keep nil WVSimilarity")
	}
}

func TestTalentSearchInteractor_CIDiagnosticSearch_TargetErrors(t *testing.T) {
	it := usecase.NewTalentSearchInteractor(&talentSearchQueryStub{})
	if _, _, err := it.CIDiagnosticSearch(context.Background(), talentsearch.DiagnosticSearchInput{}); !errors.Is(err, talentsearch.ErrCIWeightsRequired) {
		t.Errorf("err = %v, want ErrCIWeightsRequired", err)
	}
}

func TestTalentSearchInteractor_IntegratedDiagnosticSearch(t *testing.T) {
	ci := [6]float64{4, 0, 0, 0, 0, 0}
	stub := &talentSearchQueryStub{
		publicWVFn: func(_ context.Context, _ []string) ([]talentsearch.UserWVScores, error) {
			return []talentsearch.UserWVScores{
				{UserID: "both", Scores: map[string]float64{"achievement": 80}},
				{UserID: "wvonly", Scores: map[string]float64{"achievement": 80}},
			}, nil
		},
		publicCIFn: func(_ context.Context, _ []string) ([]talentsearch.UserCIScores, error) {
			return []talentsearch.UserCIScores{
				{UserID: "both", Scores: [6]float64{4, 0, 0, 0, 0, 0}},
				{UserID: "cionly", Scores: [6]float64{4, 0, 0, 0, 0, 0}},
			}, nil
		},
	}
	it := usecase.NewTalentSearchInteractor(stub)

	cards, total, err := it.IntegratedDiagnosticSearch(context.Background(), talentsearch.DiagnosticSearchInput{
		CustomWV: map[string]float64{"achievement": 80}, CustomCI: &ci, Limit: 20,
	})
	if err != nil {
		t.Fatalf("IntegratedDiagnosticSearch: %v", err)
	}
	if total != 1 || len(cards) != 1 || cards[0].UserID != "both" {
		t.Fatalf("only users with both diagnostics rank: got %v total=%d", cards, total)
	}
	c := cards[0]
	if *c.Similarity != 100.1 || *c.WVSimilarity != 100.1 || *c.CISimilarity != 100.1 || *c.IntSimilarity != 100.1 {
		t.Errorf("similarities = %v/%v/%v/%v, want all 100.1",
			*c.Similarity, *c.WVSimilarity, *c.CISimilarity, *c.IntSimilarity)
	}
}

func TestTalentSearchInteractor_IntegratedDiagnosticSearch_TargetErrors(t *testing.T) {
	notFound := errors.New("not found")
	newStub := func(wvErr, ciErr error) *talentSearchQueryStub {
		return &talentSearchQueryStub{
			teamCompanyIDFn: func(_ context.Context, _ string) (string, error) { return "c1", nil },
			teamWVFn: func(_ context.Context, _ string) (map[string]float64, error) {
				if wvErr != nil {
					return nil, wvErr
				}
				return map[string]float64{"achievement": 70}, nil
			},
			teamCIFn: func(_ context.Context, _ string) ([6]float64, error) {
				if ciErr != nil {
					return [6]float64{}, ciErr
				}
				return [6]float64{3, 0, 0, 0, 0, 0}, nil
			},
		}
	}

	for _, tc := range []struct {
		name         string
		wvErr, ciErr error
		want         error
	}{
		{"both missing", notFound, notFound, talentsearch.ErrTeamDiagUnavailable},
		{"wv missing", notFound, nil, talentsearch.ErrTeamWVMissing},
		{"ci missing", nil, notFound, talentsearch.ErrTeamCIMissing},
	} {
		it := usecase.NewTalentSearchInteractor(newStub(tc.wvErr, tc.ciErr))
		in := talentsearch.DiagnosticSearchInput{CompanyID: "c1", TeamID: "t1"}
		if _, _, err := it.IntegratedDiagnosticSearch(context.Background(), in); !errors.Is(err, tc.want) {
			t.Errorf("%s: err = %v, want %v", tc.name, err, tc.want)
		}
	}

	it := usecase.NewTalentSearchInteractor(&talentSearchQueryStub{})
	if _, _, err := it.IntegratedDiagnosticSearch(context.Background(), talentsearch.DiagnosticSearchInput{
		CustomWV: map[string]float64{"achievement": 80},
	}); !errors.Is(err, talentsearch.ErrBothWeightsRequired) {
		t.Errorf("wv only: err = %v, want ErrBothWeightsRequired", err)
	}
}
