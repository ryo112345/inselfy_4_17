package usecase_test

import (
	"context"
	"errors"
	"math"
	"strings"
	"testing"

	"github.com/akiyama/inselfy/backend/internal/domain/company"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

type companyTeamRepoStub struct {
	getTeamOwnerFn     func(ctx context.Context, teamID string) (string, error)
	countMembersFn     func(ctx context.Context, teamID string) (int, error)
	createMemberUserFn func(ctx context.Context, username, name string) (string, error)
	addMemberFn        func(ctx context.Context, teamID, userID, name string, email *string, inviteToken string) (*company.TeamMember, error)
	getMemberUserIDFn  func(ctx context.Context, teamID, memberID string) (string, error)
	deleteMemberFn     func(ctx context.Context, teamID, memberID string) error
	deleteMemberUserFn func(ctx context.Context, userID string) error
	unsetAceFn         func(ctx context.Context, teamID string) error
	setAceFn           func(ctx context.Context, teamID, memberID string) error
	createTeamFn       func(ctx context.Context, companyID, name string, description *string) (*company.Team, error)
}

func (s *companyTeamRepoStub) CreateTeam(ctx context.Context, companyID, name string, description *string) (*company.Team, error) {
	if s.createTeamFn != nil {
		return s.createTeamFn(ctx, companyID, name, description)
	}
	return &company.Team{ID: "team-1", CompanyID: companyID, Name: name, Description: description}, nil
}

func (s *companyTeamRepoStub) GetTeam(_ context.Context, teamID, companyID string) (*company.Team, error) {
	return &company.Team{ID: teamID, CompanyID: companyID}, nil
}

func (s *companyTeamRepoStub) UpdateTeam(_ context.Context, _, _, _ string, _ *string, _ *bool) error {
	return nil
}
func (s *companyTeamRepoStub) DeleteTeam(_ context.Context, _, _ string) error { return nil }
func (s *companyTeamRepoStub) GetTeamOwner(ctx context.Context, teamID string) (string, error) {
	if s.getTeamOwnerFn != nil {
		return s.getTeamOwnerFn(ctx, teamID)
	}
	return "company-1", nil
}

func (s *companyTeamRepoStub) ListMembers(_ context.Context, _ string) ([]company.TeamMember, error) {
	return nil, nil
}

func (s *companyTeamRepoStub) CountMembers(ctx context.Context, teamID string) (int, error) {
	if s.countMembersFn != nil {
		return s.countMembersFn(ctx, teamID)
	}
	return 0, nil
}

func (s *companyTeamRepoStub) CreateMemberUser(ctx context.Context, username, name string) (string, error) {
	if s.createMemberUserFn != nil {
		return s.createMemberUserFn(ctx, username, name)
	}
	return "user-1", nil
}

func (s *companyTeamRepoStub) AddMember(ctx context.Context, teamID, userID, name string, email *string, inviteToken string) (*company.TeamMember, error) {
	if s.addMemberFn != nil {
		return s.addMemberFn(ctx, teamID, userID, name, email, inviteToken)
	}
	return &company.TeamMember{ID: "member-1", Name: name, Email: email, InviteToken: inviteToken}, nil
}

func (s *companyTeamRepoStub) GetMemberUserID(ctx context.Context, teamID, memberID string) (string, error) {
	if s.getMemberUserIDFn != nil {
		return s.getMemberUserIDFn(ctx, teamID, memberID)
	}
	return "user-1", nil
}

func (s *companyTeamRepoStub) DeleteMember(ctx context.Context, teamID, memberID string) error {
	if s.deleteMemberFn != nil {
		return s.deleteMemberFn(ctx, teamID, memberID)
	}
	return nil
}

func (s *companyTeamRepoStub) DeleteMemberUser(ctx context.Context, userID string) error {
	if s.deleteMemberUserFn != nil {
		return s.deleteMemberUserFn(ctx, userID)
	}
	return nil
}

func (s *companyTeamRepoStub) UnsetAce(ctx context.Context, teamID string) error {
	if s.unsetAceFn != nil {
		return s.unsetAceFn(ctx, teamID)
	}
	return nil
}

func (s *companyTeamRepoStub) SetAce(ctx context.Context, teamID, memberID string) error {
	if s.setAceFn != nil {
		return s.setAceFn(ctx, teamID, memberID)
	}
	return nil
}

type companyTeamQueryStub struct {
	listPublicTeamsFn  func(ctx context.Context, companyID string) ([]company.PublicTeamInfo, error)
	listMemberStatesFn func(ctx context.Context, teamID string) ([]company.TeamMemberState, error)
	listUserWVScoresFn func(ctx context.Context, userID string) ([]company.ScoreRow, error)
	listUserCIScoresFn func(ctx context.Context, userID string) ([]company.ScoreRow, error)
	getLatestWNMuFn    func(ctx context.Context, userID string) (map[string]float64, error)
}

func (s *companyTeamQueryStub) ListTeamSummaries(_ context.Context, _ string) ([]company.TeamSummary, error) {
	return nil, nil
}

func (s *companyTeamQueryStub) ListPublicTeams(ctx context.Context, companyID string) ([]company.PublicTeamInfo, error) {
	if s.listPublicTeamsFn != nil {
		return s.listPublicTeamsFn(ctx, companyID)
	}
	return nil, nil
}

func (s *companyTeamQueryStub) ListMemberStates(ctx context.Context, teamID string) ([]company.TeamMemberState, error) {
	if s.listMemberStatesFn != nil {
		return s.listMemberStatesFn(ctx, teamID)
	}
	return nil, nil
}

func (s *companyTeamQueryStub) ListUserWVScores(ctx context.Context, userID string) ([]company.ScoreRow, error) {
	if s.listUserWVScoresFn != nil {
		return s.listUserWVScoresFn(ctx, userID)
	}
	return nil, nil
}

func (s *companyTeamQueryStub) ListUserCIScores(ctx context.Context, userID string) ([]company.ScoreRow, error) {
	if s.listUserCIScoresFn != nil {
		return s.listUserCIScoresFn(ctx, userID)
	}
	return nil, nil
}

func (s *companyTeamQueryStub) GetLatestWNMu(ctx context.Context, userID string) (map[string]float64, error) {
	if s.getLatestWNMuFn != nil {
		return s.getLatestWNMuFn(ctx, userID)
	}
	return nil, nil
}

func newCompanyTeamInteractor(repo *companyTeamRepoStub, query *companyTeamQueryStub) *usecase.CompanyTeamInteractor {
	return usecase.NewCompanyTeamInteractor(repo, query, inlineTxManager{})
}

func TestCompanyTeamInteractor_CreateTeam_ValidatesName(t *testing.T) {
	it := newCompanyTeamInteractor(&companyTeamRepoStub{}, &companyTeamQueryStub{})

	if _, err := it.CreateTeam(context.Background(), "company-1", "", nil); !errors.Is(err, company.ErrTeamNameRequired) {
		t.Fatalf("empty name: got %v, want ErrTeamNameRequired", err)
	}
	if _, err := it.CreateTeam(context.Background(), "company-1", strings.Repeat("a", 101), nil); !errors.Is(err, company.ErrTeamNameRequired) {
		t.Fatalf("101-char name: got %v, want ErrTeamNameRequired", err)
	}
	team, err := it.CreateTeam(context.Background(), "company-1", strings.Repeat("a", 100), nil)
	if err != nil || team == nil {
		t.Fatalf("100-char name: got (%v, %v), want team", team, err)
	}
}

func TestCompanyTeamInteractor_AddMember(t *testing.T) {
	t.Run("rejects foreign team", func(t *testing.T) {
		repo := &companyTeamRepoStub{
			getTeamOwnerFn: func(_ context.Context, _ string) (string, error) { return "other-company", nil },
		}
		it := newCompanyTeamInteractor(repo, &companyTeamQueryStub{})
		if _, err := it.AddMember(context.Background(), "company-1", "team-1", "member", nil); !errors.Is(err, company.ErrNotTeamOwner) {
			t.Fatalf("got %v, want ErrNotTeamOwner", err)
		}
	})

	t.Run("member limit precedes name validation", func(t *testing.T) {
		repo := &companyTeamRepoStub{
			countMembersFn: func(_ context.Context, _ string) (int, error) { return 30, nil },
		}
		it := newCompanyTeamInteractor(repo, &companyTeamQueryStub{})
		// Empty name too, but the limit error must win (original controller order).
		if _, err := it.AddMember(context.Background(), "company-1", "team-1", "", nil); !errors.Is(err, company.ErrTeamMemberLimit) {
			t.Fatalf("got %v, want ErrTeamMemberLimit", err)
		}
	})

	t.Run("rejects empty name under the limit", func(t *testing.T) {
		it := newCompanyTeamInteractor(&companyTeamRepoStub{}, &companyTeamQueryStub{})
		if _, err := it.AddMember(context.Background(), "company-1", "team-1", "", nil); !errors.Is(err, company.ErrTeamNameRequired) {
			t.Fatalf("got %v, want ErrTeamNameRequired", err)
		}
	})

	t.Run("creates tm_ user and hex invite token", func(t *testing.T) {
		var gotUsername, gotToken, gotUserID string
		repo := &companyTeamRepoStub{
			createMemberUserFn: func(_ context.Context, username, name string) (string, error) {
				gotUsername = username
				return "user-42", nil
			},
			addMemberFn: func(_ context.Context, _, userID, name string, email *string, token string) (*company.TeamMember, error) {
				gotUserID = userID
				gotToken = token
				return &company.TeamMember{ID: "member-1", Name: name, Email: email, InviteToken: token}, nil
			},
		}
		it := newCompanyTeamInteractor(repo, &companyTeamQueryStub{})
		member, err := it.AddMember(context.Background(), "company-1", "team-1", "山田", nil)
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if !strings.HasPrefix(gotUsername, "tm_") || len(gotUsername) != len("tm_")+12 {
			t.Errorf("username = %q, want tm_ prefix with 12 random chars", gotUsername)
		}
		if gotUserID != "user-42" {
			t.Errorf("userID passed to AddMember = %q, want user-42", gotUserID)
		}
		if len(gotToken) != 48 {
			t.Errorf("invite token length = %d, want 48 hex chars", len(gotToken))
		}
		if member.InviteToken != gotToken {
			t.Errorf("member token = %q, want %q", member.InviteToken, gotToken)
		}
	})
}

func TestCompanyTeamInteractor_RemoveMember_CleansUpUser(t *testing.T) {
	var deletedUserID string
	repo := &companyTeamRepoStub{
		getMemberUserIDFn: func(_ context.Context, _, _ string) (string, error) { return "user-7", nil },
		deleteMemberUserFn: func(_ context.Context, userID string) error {
			deletedUserID = userID
			return errors.New("cleanup failed") // best effort: must not surface
		},
	}
	it := newCompanyTeamInteractor(repo, &companyTeamQueryStub{})
	if err := it.RemoveMember(context.Background(), "company-1", "team-1", "member-1"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if deletedUserID != "user-7" {
		t.Errorf("deleted user = %q, want user-7", deletedUserID)
	}
}

func TestCompanyTeamInteractor_SetAceMember(t *testing.T) {
	t.Run("unsets previous ace before setting", func(t *testing.T) {
		var calls []string
		repo := &companyTeamRepoStub{
			unsetAceFn: func(_ context.Context, _ string) error {
				calls = append(calls, "unset")
				return nil
			},
			setAceFn: func(_ context.Context, _, _ string) error {
				calls = append(calls, "set")
				return nil
			},
		}
		it := newCompanyTeamInteractor(repo, &companyTeamQueryStub{})
		if err := it.SetAceMember(context.Background(), "company-1", "team-1", "member-1"); err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if len(calls) != 2 || calls[0] != "unset" || calls[1] != "set" {
			t.Errorf("calls = %v, want [unset set]", calls)
		}
	})

	t.Run("propagates missing member", func(t *testing.T) {
		repo := &companyTeamRepoStub{
			setAceFn: func(_ context.Context, _, _ string) error { return company.ErrTeamMemberNotFound },
		}
		it := newCompanyTeamInteractor(repo, &companyTeamQueryStub{})
		if err := it.SetAceMember(context.Background(), "company-1", "team-1", "member-1"); !errors.Is(err, company.ErrTeamMemberNotFound) {
			t.Fatalf("got %v, want ErrTeamMemberNotFound", err)
		}
	})
}

func TestCompanyTeamInteractor_GetTeamScores(t *testing.T) {
	query := &companyTeamQueryStub{
		listMemberStatesFn: func(_ context.Context, _ string) ([]company.TeamMemberState, error) {
			return []company.TeamMemberState{
				{MemberID: "m1", UserID: "u1", Name: "A", WVStatus: "completed", CIStatus: "pending"},
				{MemberID: "m2", UserID: "u2", Name: "B", WVStatus: "pending", CIStatus: "pending"},
			}, nil
		},
		listUserWVScoresFn: func(_ context.Context, userID string) ([]company.ScoreRow, error) {
			// Newest session first; the duplicated id from an older session must be dropped.
			return []company.ScoreRow{
				{ID: "creativity", DisplayScore: 90, Rank: 1},
				{ID: "autonomy", DisplayScore: 80, Rank: 2},
				{ID: "creativity", DisplayScore: 10, Rank: 21},
			}, nil
		},
	}
	it := newCompanyTeamInteractor(&companyTeamRepoStub{}, query)

	scores, err := it.GetTeamScores(context.Background(), "company-1", "team-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(scores) != 2 {
		t.Fatalf("len = %d, want 2", len(scores))
	}
	wv := scores[0].WVScores
	if len(wv) != 2 || wv[0].ID != "creativity" || wv[0].DisplayScore != 90 || wv[1].ID != "autonomy" {
		t.Errorf("wv scores = %+v, want latest-session creativity=90 then autonomy", wv)
	}
	if scores[1].WVScores != nil || scores[1].CIScores != nil {
		t.Errorf("pending member must have no scores, got %+v", scores[1])
	}
}

func TestCompanyTeamInteractor_GetPublicTeamScores(t *testing.T) {
	memberStates := func(states ...company.TeamMemberState) func(context.Context, string) ([]company.TeamMemberState, error) {
		return func(_ context.Context, _ string) ([]company.TeamMemberState, error) { return states, nil }
	}
	publicTeam := func(_ context.Context, _ string) ([]company.PublicTeamInfo, error) {
		return []company.PublicTeamInfo{{ID: "team-1", Name: "T", MemberCount: 3}}, nil
	}

	t.Run("hides averages below three completed members", func(t *testing.T) {
		query := &companyTeamQueryStub{
			listPublicTeamsFn: publicTeam,
			listMemberStatesFn: memberStates(
				company.TeamMemberState{UserID: "u1", WVStatus: "completed"},
				company.TeamMemberState{UserID: "u2", WVStatus: "completed"},
				company.TeamMemberState{UserID: "u3", WVStatus: "pending"},
			),
			listUserWVScoresFn: func(_ context.Context, _ string) ([]company.ScoreRow, error) {
				return []company.ScoreRow{{ID: "achievement", DisplayScore: 50}}, nil
			},
		}
		it := newCompanyTeamInteractor(&companyTeamRepoStub{}, query)
		teams, err := it.GetPublicTeamScores(context.Background(), "company-1")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		if teams[0].WVScores != nil {
			t.Errorf("wv scores = %+v, want nil below the member minimum", teams[0].WVScores)
		}
		if teams[0].CompletedCount != 2 {
			t.Errorf("completed count = %d, want 2", teams[0].CompletedCount)
		}
	})

	t.Run("weights aces up and outliers down", func(t *testing.T) {
		wvByUser := map[string]float64{"u1": 80, "u2": 60, "u3": 10}
		query := &companyTeamQueryStub{
			listPublicTeamsFn: publicTeam,
			listMemberStatesFn: memberStates(
				company.TeamMemberState{UserID: "u1", WVStatus: "completed", IsAce: true},
				company.TeamMemberState{UserID: "u2", WVStatus: "completed"},
				company.TeamMemberState{UserID: "u3", WVStatus: "completed"},
			),
			listUserWVScoresFn: func(_ context.Context, userID string) ([]company.ScoreRow, error) {
				return []company.ScoreRow{{ID: "achievement", DisplayScore: wvByUser[userID]}}, nil
			},
		}
		it := newCompanyTeamInteractor(&companyTeamRepoStub{}, query)
		teams, err := it.GetPublicTeamScores(context.Background(), "company-1")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		wv := teams[0].WVScores
		if len(wv) != 6 {
			t.Fatalf("wv entries = %d, want 6 (one per value)", len(wv))
		}
		// simpleAvg = 50; ace u1 weight 1.8, u2 within threshold weight 1.0,
		// u3 |10-50| > 25 outlier weight 0.15:
		// (1.8*80 + 1.0*60 + 0.15*10) / 2.95
		want := (1.8*80 + 60 + 0.15*10) / 2.95
		if wv[0].ID != "achievement" || math.Abs(wv[0].Score-want) > 1e-9 {
			t.Errorf("achievement = %+v, want score %.6f", wv[0], want)
		}
		for _, e := range wv[1:] {
			if e.Score != 0 {
				t.Errorf("value %s score = %f, want 0 for unscored values", e.ID, e.Score)
			}
		}
		if teams[0].CompletedCount != 3 {
			t.Errorf("completed count = %d, want 3", teams[0].CompletedCount)
		}
	})

	t.Run("transforms work-needs mu through sigmoid", func(t *testing.T) {
		query := &companyTeamQueryStub{
			listPublicTeamsFn: publicTeam,
			listMemberStatesFn: memberStates(
				company.TeamMemberState{UserID: "u1", WVStatus: "completed"},
				company.TeamMemberState{UserID: "u2", WVStatus: "completed"},
				company.TeamMemberState{UserID: "u3", WVStatus: "completed"},
			),
			getLatestWNMuFn: func(_ context.Context, _ string) (map[string]float64, error) {
				return map[string]float64{"creativity": 0}, nil
			},
		}
		it := newCompanyTeamInteractor(&companyTeamRepoStub{}, query)
		teams, err := it.GetPublicTeamScores(context.Background(), "company-1")
		if err != nil {
			t.Fatalf("unexpected error: %v", err)
		}
		wn := teams[0].WNScores
		if wn == nil {
			t.Fatal("wn scores = nil, want aggregated entries")
		}
		for _, e := range wn {
			if e.ID == "creativity" && math.Abs(e.Score-50) > 1e-9 {
				t.Errorf("creativity = %f, want 50 (sigmoid of mu=0)", e.Score)
			}
		}
		// No wv/ci data: completed count must stay 0 (wn alone doesn't count).
		if teams[0].CompletedCount != 0 {
			t.Errorf("completed count = %d, want 0", teams[0].CompletedCount)
		}
	})
}
