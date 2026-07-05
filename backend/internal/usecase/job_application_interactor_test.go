package usecase_test

import (
	"context"
	"errors"
	"testing"

	"github.com/akiyama/inselfy/backend/internal/domain/jobapplication"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

// Expected similarity values are computed independently from the spec:
// per-dimension Gaussian closeness (sigma WV=18, CI=0.7, floor 0.001),
// geometric mean (WV weighted by the user's own scores), ×1000, rounded, /10.
// An exact match yields 100.1 on both scales.

func listApps(apps ...*jobapplication.JobApplicationWithDetails) *jobApplicationRepoStub {
	return &jobApplicationRepoStub{
		listByCompanyIDFn: func(_ context.Context, _ string, _ jobapplication.ListFilter) ([]*jobapplication.JobApplicationWithDetails, int, error) {
			return apps, len(apps), nil
		},
	}
}

func app(jobPostingID, candidateID string) *jobapplication.JobApplicationWithDetails {
	return &jobapplication.JobApplicationWithDetails{
		JobApplication: jobapplication.JobApplication{JobPostingID: jobPostingID, CandidateID: candidateID},
	}
}

func TestJobApplicationInteractor_ListByCompany_FillsSimilarity(t *testing.T) {
	teamWV := map[string]float64{"achievement": 80, "comfort": 40}
	teamCI := [6]float64{5, 4, 3, 2, 1, 0}
	query := &jobApplicationQueryStub{
		jobPostingTeamIDsFn: func(_ context.Context, _ []string) (map[string]string, error) {
			return map[string]string{"jp1": "team1"}, nil
		},
		teamCompanyIDFn: func(_ context.Context, teamID string) (string, error) {
			if teamID != "team1" {
				t.Errorf("teamID = %s, want team1", teamID)
			}
			return "c1", nil
		},
		teamWVFn: func(_ context.Context, _ string) (map[string]float64, error) { return teamWV, nil },
		teamCIFn: func(_ context.Context, _ string) ([6]float64, error) { return teamCI, nil },
		wvByUserIDsFn: func(_ context.Context, _ []string) (map[string]map[string]float64, error) {
			return map[string]map[string]float64{
				"cand-both":    {"achievement": 80, "comfort": 40},
				"cand-wv-only": {"achievement": 80, "comfort": 40},
			}, nil
		},
		ciByUserIDsFn: func(_ context.Context, _ []string) (map[string][6]float64, error) {
			return map[string][6]float64{"cand-both": teamCI}, nil
		},
	}
	both := app("jp1", "cand-both")
	wvOnly := app("jp1", "cand-wv-only")
	noTeam := app("jp-no-team", "cand-both")
	it := usecase.NewJobApplicationInteractor(listApps(both, wvOnly, noTeam), nil, query)

	apps, total, err := it.ListByCompany(context.Background(), "c1", jobapplication.ListFilter{})
	if err != nil {
		t.Fatalf("ListByCompany: %v", err)
	}
	if total != 3 || len(apps) != 3 {
		t.Fatalf("total=%d len=%d, want 3/3", total, len(apps))
	}
	if both.WVSimilarity == nil || *both.WVSimilarity != 100.1 {
		t.Errorf("both.WVSimilarity = %v, want 100.1", both.WVSimilarity)
	}
	if both.CISimilarity == nil || *both.CISimilarity != 100.1 {
		t.Errorf("both.CISimilarity = %v, want 100.1", both.CISimilarity)
	}
	if both.IntSimilarity == nil || *both.IntSimilarity != 100.1 {
		t.Errorf("both.IntSimilarity = %v, want 100.1", both.IntSimilarity)
	}
	if wvOnly.WVSimilarity == nil || *wvOnly.WVSimilarity != 100.1 {
		t.Errorf("wvOnly.WVSimilarity = %v, want 100.1", wvOnly.WVSimilarity)
	}
	if wvOnly.CISimilarity != nil || wvOnly.IntSimilarity != nil {
		t.Errorf("wvOnly has no CI diagnostics: CI/Int should stay nil")
	}
	if noTeam.WVSimilarity != nil || noTeam.CISimilarity != nil || noTeam.IntSimilarity != nil {
		t.Errorf("posting without team should stay unenriched")
	}
}

func TestJobApplicationInteractor_ListByCompany_SkipsForeignTeam(t *testing.T) {
	query := &jobApplicationQueryStub{
		jobPostingTeamIDsFn: func(_ context.Context, _ []string) (map[string]string, error) {
			return map[string]string{"jp1": "team1"}, nil
		},
		teamCompanyIDFn: func(_ context.Context, _ string) (string, error) { return "other-company", nil },
	}
	a := app("jp1", "cand1")
	it := usecase.NewJobApplicationInteractor(listApps(a), nil, query)

	if _, _, err := it.ListByCompany(context.Background(), "c1", jobapplication.ListFilter{}); err != nil {
		t.Fatalf("ListByCompany: %v", err)
	}
	if a.WVSimilarity != nil || a.CISimilarity != nil || a.IntSimilarity != nil {
		t.Errorf("foreign team must not be used for similarity")
	}
}

func TestJobApplicationInteractor_ListByCompany_QueryErrorDegradesSilently(t *testing.T) {
	query := &jobApplicationQueryStub{
		jobPostingTeamIDsFn: func(_ context.Context, _ []string) (map[string]string, error) {
			return nil, errors.New("db down")
		},
	}
	a := app("jp1", "cand1")
	it := usecase.NewJobApplicationInteractor(listApps(a), nil, query)

	apps, total, err := it.ListByCompany(context.Background(), "c1", jobapplication.ListFilter{})
	if err != nil {
		t.Fatalf("ListByCompany should not fail on enrichment errors: %v", err)
	}
	if total != 1 || len(apps) != 1 {
		t.Fatalf("total=%d len=%d, want 1/1", total, len(apps))
	}
	if a.WVSimilarity != nil || a.CISimilarity != nil || a.IntSimilarity != nil {
		t.Errorf("similarity should stay nil when team lookup fails")
	}
}

func TestJobApplicationInteractor_ListByCompany_TeamWVErrorStillFillsCI(t *testing.T) {
	teamCI := [6]float64{5, 4, 3, 2, 1, 0}
	query := &jobApplicationQueryStub{
		jobPostingTeamIDsFn: func(_ context.Context, _ []string) (map[string]string, error) {
			return map[string]string{"jp1": "team1"}, nil
		},
		teamCompanyIDFn: func(_ context.Context, _ string) (string, error) { return "c1", nil },
		teamWVFn: func(_ context.Context, _ string) (map[string]float64, error) {
			return nil, errors.New("no completed data")
		},
		teamCIFn: func(_ context.Context, _ string) ([6]float64, error) { return teamCI, nil },
		wvByUserIDsFn: func(_ context.Context, _ []string) (map[string]map[string]float64, error) {
			return map[string]map[string]float64{"cand1": {"achievement": 80}}, nil
		},
		ciByUserIDsFn: func(_ context.Context, _ []string) (map[string][6]float64, error) {
			return map[string][6]float64{"cand1": teamCI}, nil
		},
	}
	a := app("jp1", "cand1")
	it := usecase.NewJobApplicationInteractor(listApps(a), nil, query)

	if _, _, err := it.ListByCompany(context.Background(), "c1", jobapplication.ListFilter{}); err != nil {
		t.Fatalf("ListByCompany: %v", err)
	}
	if a.WVSimilarity != nil {
		t.Errorf("team WV unavailable: WVSimilarity should stay nil")
	}
	if a.CISimilarity == nil || *a.CISimilarity != 100.1 {
		t.Errorf("CISimilarity = %v, want 100.1", a.CISimilarity)
	}
	if a.IntSimilarity != nil {
		t.Errorf("integrated similarity needs both sides")
	}
}
