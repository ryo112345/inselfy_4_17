package presenter

import (
	"time"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/domain/company"
)

// CompanyTeamsResponse builds the team-list API response.
func CompanyTeamsResponse(summaries []company.TeamSummary) *openapi.ModelsTeamListResponse {
	teams := make([]openapi.ModelsTeamResponse, 0, len(summaries))
	for _, s := range summaries {
		teams = append(teams, openapi.ModelsTeamResponse{
			Id:          s.ID,
			CompanyId:   s.CompanyID,
			Name:        s.Name,
			Description: s.Description,
			IsPublic:    s.IsPublic,
			MemberCount: s.MemberCount,
			WvCompleted: s.WVCompleted,
			CiCompleted: s.CICompleted,
			CreatedAt:   s.CreatedAt.Format(time.RFC3339),
		})
	}
	return &openapi.ModelsTeamListResponse{Items: teams}
}

// TeamMemberResponse converts a team member to its API response.
func TeamMemberResponse(m company.TeamMember) openapi.ModelsTeamMemberResponse {
	return openapi.ModelsTeamMemberResponse{
		Id:          m.ID,
		Name:        m.Name,
		Email:       m.Email,
		InviteToken: m.InviteToken,
		WvStatus:    openapi.ModelsTeamDiagnosisStatus(m.WVStatus),
		CiStatus:    openapi.ModelsTeamDiagnosisStatus(m.CIStatus),
		IsAce:       m.IsAce,
		CreatedAt:   m.CreatedAt.Format(time.RFC3339),
	}
}

// TeamDetailResponse builds the team-detail API response.
func TeamDetailResponse(t company.Team, members []company.TeamMember) *openapi.ModelsTeamDetailResponse {
	memberResponses := make([]openapi.ModelsTeamMemberResponse, 0, len(members))
	for _, m := range members {
		memberResponses = append(memberResponses, TeamMemberResponse(m))
	}
	return &openapi.ModelsTeamDetailResponse{
		Id:          t.ID,
		CompanyId:   t.CompanyID,
		Name:        t.Name,
		Description: t.Description,
		IsPublic:    t.IsPublic,
		Members:     memberResponses,
		CreatedAt:   t.CreatedAt.Format(time.RFC3339),
	}
}

// teamScoreEntries preserves the old `json:",omitempty"` slice behavior:
// zero entries (nil or empty) render as an absent key.
func teamScoreEntries(rows []company.ScoreRow) *[]openapi.ModelsTeamScoreEntry {
	if len(rows) == 0 {
		return nil
	}
	scores := make([]openapi.ModelsTeamScoreEntry, 0, len(rows))
	for _, r := range rows {
		scores = append(scores, openapi.ModelsTeamScoreEntry{Id: r.ID, DisplayScore: r.DisplayScore, Rank: r.Rank})
	}
	return &scores
}

// TeamScoresResponse builds the member-scores API response.
func TeamScoresResponse(memberScores []company.TeamMemberScores) *openapi.ModelsTeamScoresResponse {
	result := make([]openapi.ModelsMemberScoreResponse, 0, len(memberScores))
	for _, m := range memberScores {
		result = append(result, openapi.ModelsMemberScoreResponse{
			MemberId:   m.MemberID,
			MemberName: m.Name,
			UserId:     m.UserID,
			WvStatus:   openapi.ModelsTeamDiagnosisStatus(m.WVStatus),
			CiStatus:   openapi.ModelsTeamDiagnosisStatus(m.CIStatus),
			IsAce:      m.IsAce,
			WvScores:   teamScoreEntries(m.WVScores),
			CiScores:   teamScoreEntries(m.CIScores),
		})
	}
	return &openapi.ModelsTeamScoresResponse{Items: result}
}

// publicScoreEntries keeps nil as nil: the public response renders missing
// aggregates (too few completed members) as JSON null, not [].
func publicScoreEntries(entries []company.PublicScoreEntry) *[]openapi.ModelsPublicScoreEntry {
	if entries == nil {
		return nil
	}
	result := make([]openapi.ModelsPublicScoreEntry, 0, len(entries))
	for _, e := range entries {
		result = append(result, openapi.ModelsPublicScoreEntry{Id: e.ID, Score: e.Score})
	}
	return &result
}

// PublicTeamScoresResponse builds the public team-scores API response.
func PublicTeamScoresResponse(teams []company.TeamPublicScores) *openapi.ModelsPublicTeamScoresResponse {
	result := make([]openapi.ModelsPublicTeamScoreResponse, 0, len(teams))
	for _, t := range teams {
		result = append(result, openapi.ModelsPublicTeamScoreResponse{
			TeamId:         t.TeamID,
			TeamName:       t.TeamName,
			WvScores:       publicScoreEntries(t.WVScores),
			WnScores:       publicScoreEntries(t.WNScores),
			CiScores:       publicScoreEntries(t.CIScores),
			MemberCount:    t.MemberCount,
			CompletedCount: t.CompletedCount,
		})
	}
	return &openapi.ModelsPublicTeamScoresResponse{Items: result}
}
