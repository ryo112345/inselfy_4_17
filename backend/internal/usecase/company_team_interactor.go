package usecase

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"math"

	"github.com/akiyama/inselfy/backend/internal/domain/company"
	"github.com/akiyama/inselfy/backend/internal/port"
)

const (
	teamMemberLimit = 30

	// Public team-score aggregation: ace members count more, outliers
	// (further than the threshold from the simple average) count less, and
	// averages are hidden until enough members completed the diagnosis.
	aceWeight            = 1.8
	outlierWeight        = 0.15
	wvOutlierThreshold   = 25.0
	ciOutlierThreshold   = 1.0
	minMembersForAverage = 3
)

var (
	wvOrder = []string{"achievement", "status", "autonomy", "safety", "altruism", "comfort"}
	wnOrder = []string{
		"ability_utilization", "achievement", "activity", "advancement", "authority", "autonomy",
		"company_policies", "compensation", "co_workers", "creativity", "independence", "moral_values",
		"recognition", "responsibility", "security", "social_service", "social_status",
		"supervision_hr", "supervision_technical", "variety", "working_conditions",
	}
	ciOrder = []string{"R", "I", "A", "S", "E", "C"}
)

// CompanyTeamInteractor implements port.CompanyTeamInputPort.
type CompanyTeamInteractor struct {
	repo  port.CompanyTeamRepository
	query port.CompanyTeamQueryService
	tx    port.TxManager
}

var _ port.CompanyTeamInputPort = (*CompanyTeamInteractor)(nil)

func NewCompanyTeamInteractor(repo port.CompanyTeamRepository, query port.CompanyTeamQueryService, tx port.TxManager) *CompanyTeamInteractor {
	return &CompanyTeamInteractor{repo: repo, query: query, tx: tx}
}

func validTeamName(name string) bool {
	return name != "" && len(name) <= 100
}

// verifyTeamOwner ensures the team exists and belongs to the company.
func (i *CompanyTeamInteractor) verifyTeamOwner(ctx context.Context, companyID, teamID string) error {
	ownerID, err := i.repo.GetTeamOwner(ctx, teamID)
	if err != nil {
		return err
	}
	if ownerID != companyID {
		return company.ErrNotTeamOwner
	}
	return nil
}

func (i *CompanyTeamInteractor) ListTeams(ctx context.Context, companyID string) ([]company.TeamSummary, error) {
	return i.query.ListTeamSummaries(ctx, companyID)
}

func (i *CompanyTeamInteractor) CreateTeam(ctx context.Context, companyID, name string, description *string) (*company.Team, error) {
	if !validTeamName(name) {
		return nil, company.ErrTeamNameRequired
	}
	return i.repo.CreateTeam(ctx, companyID, name, description)
}

func (i *CompanyTeamInteractor) GetTeam(ctx context.Context, companyID, teamID string) (*company.TeamWithMembers, error) {
	team, err := i.repo.GetTeam(ctx, teamID, companyID)
	if err != nil {
		return nil, err
	}
	members, err := i.repo.ListMembers(ctx, teamID)
	if err != nil {
		return nil, err
	}
	return &company.TeamWithMembers{Team: *team, Members: members}, nil
}

func (i *CompanyTeamInteractor) UpdateTeam(ctx context.Context, companyID, teamID, name string, description *string, isPublic *bool) error {
	if !validTeamName(name) {
		return company.ErrTeamNameRequired
	}
	return i.repo.UpdateTeam(ctx, teamID, companyID, name, description, isPublic)
}

func (i *CompanyTeamInteractor) DeleteTeam(ctx context.Context, companyID, teamID string) error {
	return i.repo.DeleteTeam(ctx, teamID, companyID)
}

func (i *CompanyTeamInteractor) AddMember(ctx context.Context, companyID, teamID, name string, email *string) (*company.TeamMember, error) {
	if err := i.verifyTeamOwner(ctx, companyID, teamID); err != nil {
		return nil, err
	}

	count, err := i.repo.CountMembers(ctx, teamID)
	if err != nil {
		return nil, err
	}
	if count >= teamMemberLimit {
		return nil, company.ErrTeamMemberLimit
	}

	if !validTeamName(name) {
		return nil, company.ErrTeamNameRequired
	}

	// Each member gets a backing users record so diagnosis sessions can
	// reference a user id; the tm_ prefix marks it for cleanup on removal.
	username := fmt.Sprintf("tm_%s", randomHexString(12))
	userID, err := i.repo.CreateMemberUser(ctx, username, name)
	if err != nil {
		return nil, err
	}

	token, err := generateInviteToken()
	if err != nil {
		return nil, err
	}

	return i.repo.AddMember(ctx, teamID, userID, name, email, token)
}

func (i *CompanyTeamInteractor) RemoveMember(ctx context.Context, companyID, teamID, memberID string) error {
	if err := i.verifyTeamOwner(ctx, companyID, teamID); err != nil {
		return err
	}

	userID, err := i.repo.GetMemberUserID(ctx, teamID, memberID)
	if err != nil {
		return err
	}

	if err := i.repo.DeleteMember(ctx, teamID, memberID); err != nil {
		return err
	}

	// Clean up the auto-created user record (best effort).
	_ = i.repo.DeleteMemberUser(ctx, userID)

	return nil
}

func (i *CompanyTeamInteractor) GetTeamScores(ctx context.Context, companyID, teamID string) ([]company.TeamMemberScores, error) {
	if err := i.verifyTeamOwner(ctx, companyID, teamID); err != nil {
		return nil, err
	}

	members, err := i.query.ListMemberStates(ctx, teamID)
	if err != nil {
		return nil, err
	}

	result := make([]company.TeamMemberScores, 0, len(members))
	for _, m := range members {
		ms := company.TeamMemberScores{TeamMemberState: m}
		if m.WVStatus == "completed" {
			if rows, err := i.query.ListUserWVScores(ctx, m.UserID); err == nil {
				ms.WVScores = dedupeScoreRows(rows)
			}
		}
		if m.CIStatus == "completed" {
			if rows, err := i.query.ListUserCIScores(ctx, m.UserID); err == nil {
				ms.CIScores = dedupeScoreRows(rows)
			}
		}
		result = append(result, ms)
	}
	return result, nil
}

// dedupeScoreRows keeps the first row per score id; rows arrive newest
// session first, so this picks the latest session's scores.
func dedupeScoreRows(rows []company.ScoreRow) []company.ScoreRow {
	seen := map[string]bool{}
	var result []company.ScoreRow
	for _, r := range rows {
		if !seen[r.ID] {
			seen[r.ID] = true
			result = append(result, r)
		}
	}
	return result
}

func (i *CompanyTeamInteractor) SetAceMember(ctx context.Context, companyID, teamID, memberID string) error {
	if err := i.verifyTeamOwner(ctx, companyID, teamID); err != nil {
		return err
	}

	return i.tx.WithinTransaction(ctx, func(ctx context.Context) error {
		if err := i.repo.UnsetAce(ctx, teamID); err != nil {
			return err
		}
		return i.repo.SetAce(ctx, teamID, memberID)
	})
}

func (i *CompanyTeamInteractor) UnsetAceMember(ctx context.Context, companyID, teamID string) error {
	if err := i.verifyTeamOwner(ctx, companyID, teamID); err != nil {
		return err
	}
	return i.repo.UnsetAce(ctx, teamID)
}

func (i *CompanyTeamInteractor) GetPublicTeamScores(ctx context.Context, companyID string) ([]company.TeamPublicScores, error) {
	teams, err := i.query.ListPublicTeams(ctx, companyID)
	if err != nil {
		return nil, err
	}

	result := make([]company.TeamPublicScores, 0, len(teams))
	for _, t := range teams {
		members, err := i.query.ListMemberStates(ctx, t.ID)
		if err != nil {
			return nil, err
		}

		var scoreData []memberScoreData
		completedCount := 0
		for _, m := range members {
			sd := memberScoreData{isAce: m.IsAce}
			hasData := false

			if m.WVStatus == "completed" {
				if rows, err := i.query.ListUserWVScores(ctx, m.UserID); err == nil {
					sd.wvScores = latestScoreMap(rows)
					if len(sd.wvScores) > 0 {
						hasData = true
					}
				}
				if mu, err := i.query.GetLatestWNMu(ctx, m.UserID); err == nil && mu != nil {
					sd.wnScores = make(map[string]float64, len(mu))
					for k, v := range mu {
						sd.wnScores[k] = 100.0 / (1.0 + math.Exp(-v))
					}
				}
			}

			if m.CIStatus == "completed" {
				if rows, err := i.query.ListUserCIScores(ctx, m.UserID); err == nil {
					sd.ciScores = latestScoreMap(rows)
					if len(sd.ciScores) > 0 {
						hasData = true
					}
				}
			}

			if hasData {
				completedCount++
			}
			scoreData = append(scoreData, sd)
		}

		result = append(result, company.TeamPublicScores{
			TeamID:         t.ID,
			TeamName:       t.Name,
			MemberCount:    t.MemberCount,
			CompletedCount: completedCount,
			WVScores:       computeWeightedAvg(scoreData, "wv", wvOrder, wvOutlierThreshold),
			WNScores:       computeWeightedAvg(scoreData, "wn", wnOrder, wvOutlierThreshold),
			CIScores:       computeWeightedAvg(scoreData, "ci", ciOrder, ciOutlierThreshold),
		})
	}
	return result, nil
}

// latestScoreMap keeps the first score per id (rows arrive newest session first).
func latestScoreMap(rows []company.ScoreRow) map[string]float64 {
	m := map[string]float64{}
	for _, r := range rows {
		if _, exists := m[r.ID]; !exists {
			m[r.ID] = r.DisplayScore
		}
	}
	return m
}

type memberScoreData struct {
	wvScores map[string]float64
	wnScores map[string]float64
	ciScores map[string]float64
	isAce    bool
}

func (d memberScoreData) scores(kind string) map[string]float64 {
	switch kind {
	case "wv":
		return d.wvScores
	case "wn":
		return d.wnScores
	case "ci":
		return d.ciScores
	}
	return nil
}

// computeWeightedAvg aggregates member scores per id in order. Returns nil
// when fewer than minMembersForAverage members have scores of this kind.
func computeWeightedAvg(members []memberScoreData, kind string, order []string, threshold float64) []company.PublicScoreEntry {
	type entry struct {
		score float64
		isAce bool
	}

	var completed []memberScoreData
	for _, m := range members {
		if len(m.scores(kind)) > 0 {
			completed = append(completed, m)
		}
	}
	if len(completed) < minMembersForAverage {
		return nil
	}

	result := make([]company.PublicScoreEntry, 0, len(order))
	for _, id := range order {
		var entries []entry
		for _, m := range completed {
			if s, ok := m.scores(kind)[id]; ok {
				entries = append(entries, entry{score: s, isAce: m.isAce})
			}
		}
		if len(entries) == 0 {
			result = append(result, company.PublicScoreEntry{ID: id, Score: 0})
			continue
		}

		sum := 0.0
		for _, e := range entries {
			sum += e.score
		}
		simpleAvg := sum / float64(len(entries))

		weightedSum := 0.0
		weightTotal := 0.0
		for _, e := range entries {
			w := 1.0
			if e.isAce {
				w = aceWeight
			} else if math.Abs(e.score-simpleAvg) > threshold {
				w = outlierWeight
			}
			weightedSum += w * e.score
			weightTotal += w
		}
		result = append(result, company.PublicScoreEntry{ID: id, Score: weightedSum / weightTotal})
	}
	return result
}

func generateInviteToken() (string, error) {
	b := make([]byte, 24)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func randomHexString(n int) string {
	b := make([]byte, n)
	rand.Read(b)
	return hex.EncodeToString(b)[:n]
}
