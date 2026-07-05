package controller

import (
	"net/http"
	"time"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/domain/company"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type CompanyTeamController struct {
	input port.CompanyTeamInputPort
}

func NewCompanyTeamController(input port.CompanyTeamInputPort) *CompanyTeamController {
	return &CompanyTeamController{input: input}
}

type teamResponse struct {
	ID          string  `json:"id"`
	CompanyID   string  `json:"company_id"`
	Name        string  `json:"name"`
	Description *string `json:"description"`
	IsPublic    bool    `json:"is_public"`
	MemberCount int     `json:"member_count"`
	WVCompleted int     `json:"wv_completed"`
	CICompleted int     `json:"ci_completed"`
	CreatedAt   string  `json:"created_at"`
}

type memberResponse struct {
	ID          string  `json:"id"`
	Name        string  `json:"name"`
	Email       *string `json:"email"`
	InviteToken string  `json:"invite_token"`
	WVStatus    string  `json:"wv_status"`
	CIStatus    string  `json:"ci_status"`
	IsAce       bool    `json:"is_ace"`
	CreatedAt   string  `json:"created_at"`
}

type teamDetailResponse struct {
	ID          string           `json:"id"`
	CompanyID   string           `json:"company_id"`
	Name        string           `json:"name"`
	Description *string          `json:"description"`
	IsPublic    bool             `json:"is_public"`
	Members     []memberResponse `json:"members"`
	CreatedAt   string           `json:"created_at"`
}

func toMemberResponse(m company.TeamMember) memberResponse {
	return memberResponse{
		ID:          m.ID,
		Name:        m.Name,
		Email:       m.Email,
		InviteToken: m.InviteToken,
		WVStatus:    m.WVStatus,
		CIStatus:    m.CIStatus,
		IsAce:       m.IsAce,
		CreatedAt:   m.CreatedAt.Format(time.RFC3339),
	}
}

func toTeamDetailResponse(t company.Team, members []company.TeamMember) teamDetailResponse {
	memberResponses := make([]memberResponse, 0, len(members))
	for _, m := range members {
		memberResponses = append(memberResponses, toMemberResponse(m))
	}
	return teamDetailResponse{
		ID:          t.ID,
		CompanyID:   t.CompanyID,
		Name:        t.Name,
		Description: t.Description,
		IsPublic:    t.IsPublic,
		Members:     memberResponses,
		CreatedAt:   t.CreatedAt.Format(time.RFC3339),
	}
}

func (c *CompanyTeamController) companyID(ctx echo.Context) string {
	return ctx.Get(authmw.CompanyIDKey).(string)
}

func (c *CompanyTeamController) ListTeams(ctx echo.Context) error {
	companyID := c.companyID(ctx)
	if _, err := uuid.Parse(companyID); err != nil {
		return badRequest(ctx, "invalid company id")
	}

	summaries, err := c.input.ListTeams(ctx.Request().Context(), companyID)
	if err != nil {
		return handleError(ctx, err)
	}

	teams := make([]teamResponse, 0, len(summaries))
	for _, s := range summaries {
		teams = append(teams, teamResponse{
			ID:          s.ID,
			CompanyID:   s.CompanyID,
			Name:        s.Name,
			Description: s.Description,
			IsPublic:    s.IsPublic,
			MemberCount: s.MemberCount,
			WVCompleted: s.WVCompleted,
			CICompleted: s.CICompleted,
			CreatedAt:   s.CreatedAt.Format(time.RFC3339),
		})
	}

	return ctx.JSON(http.StatusOK, map[string]any{"teams": teams})
}

func (c *CompanyTeamController) CreateTeam(ctx echo.Context) error {
	companyID := c.companyID(ctx)
	if _, err := uuid.Parse(companyID); err != nil {
		return badRequest(ctx, "invalid company id")
	}

	var body struct {
		Name        string  `json:"name"`
		Description *string `json:"description"`
	}
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request")
	}

	team, err := c.input.CreateTeam(ctx.Request().Context(), companyID, body.Name, body.Description)
	if err != nil {
		return handleError(ctx, err)
	}

	return ctx.JSON(http.StatusCreated, toTeamDetailResponse(*team, nil))
}

func (c *CompanyTeamController) GetTeam(ctx echo.Context, teamID string) error {
	companyID := c.companyID(ctx)
	if _, err := uuid.Parse(teamID); err != nil {
		return badRequest(ctx, "invalid team id")
	}

	team, err := c.input.GetTeam(ctx.Request().Context(), companyID, teamID)
	if err != nil {
		return handleError(ctx, err)
	}

	return ctx.JSON(http.StatusOK, toTeamDetailResponse(team.Team, team.Members))
}

func (c *CompanyTeamController) UpdateTeam(ctx echo.Context, teamID string) error {
	companyID := c.companyID(ctx)
	if _, err := uuid.Parse(teamID); err != nil {
		return badRequest(ctx, "invalid team id")
	}

	var body struct {
		Name        string  `json:"name"`
		Description *string `json:"description"`
		IsPublic    *bool   `json:"is_public"`
	}
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request")
	}

	if err := c.input.UpdateTeam(ctx.Request().Context(), companyID, teamID, body.Name, body.Description, body.IsPublic); err != nil {
		return handleError(ctx, err)
	}

	return ctx.NoContent(http.StatusNoContent)
}

func (c *CompanyTeamController) DeleteTeam(ctx echo.Context, teamID string) error {
	companyID := c.companyID(ctx)
	if _, err := uuid.Parse(teamID); err != nil {
		return badRequest(ctx, "invalid team id")
	}

	if err := c.input.DeleteTeam(ctx.Request().Context(), companyID, teamID); err != nil {
		return handleError(ctx, err)
	}

	return ctx.NoContent(http.StatusNoContent)
}

func (c *CompanyTeamController) AddMember(ctx echo.Context, teamID string) error {
	companyID := c.companyID(ctx)
	if _, err := uuid.Parse(teamID); err != nil {
		return badRequest(ctx, "invalid team id")
	}

	var body struct {
		Name  string  `json:"name"`
		Email *string `json:"email"`
	}
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request")
	}

	member, err := c.input.AddMember(ctx.Request().Context(), companyID, teamID, body.Name, body.Email)
	if err != nil {
		return handleError(ctx, err)
	}

	return ctx.JSON(http.StatusCreated, toMemberResponse(*member))
}

func (c *CompanyTeamController) RemoveMember(ctx echo.Context, teamID, memberID string) error {
	companyID := c.companyID(ctx)
	if _, err := uuid.Parse(teamID); err != nil {
		return badRequest(ctx, "invalid team id")
	}
	if _, err := uuid.Parse(memberID); err != nil {
		return badRequest(ctx, "invalid member id")
	}

	if err := c.input.RemoveMember(ctx.Request().Context(), companyID, teamID, memberID); err != nil {
		return handleError(ctx, err)
	}

	return ctx.NoContent(http.StatusNoContent)
}

type memberScoreResponse struct {
	MemberID   string  `json:"member_id"`
	MemberName string  `json:"member_name"`
	UserID     string  `json:"user_id"`
	WVStatus   string  `json:"wv_status"`
	CIStatus   string  `json:"ci_status"`
	IsAce      bool    `json:"is_ace"`
	WVScores   []score `json:"wv_scores,omitempty"`
	CIScores   []score `json:"ci_scores,omitempty"`
}

type score struct {
	ID           string  `json:"id"`
	DisplayScore float64 `json:"display_score"`
	Rank         int     `json:"rank"`
}

func toScores(rows []company.ScoreRow) []score {
	if rows == nil {
		return nil
	}
	scores := make([]score, 0, len(rows))
	for _, r := range rows {
		scores = append(scores, score{ID: r.ID, DisplayScore: r.DisplayScore, Rank: r.Rank})
	}
	return scores
}

func (c *CompanyTeamController) GetTeamScores(ctx echo.Context, teamID string) error {
	companyID := c.companyID(ctx)
	if _, err := uuid.Parse(teamID); err != nil {
		return badRequest(ctx, "invalid team id")
	}

	memberScores, err := c.input.GetTeamScores(ctx.Request().Context(), companyID, teamID)
	if err != nil {
		return handleError(ctx, err)
	}

	result := make([]memberScoreResponse, 0, len(memberScores))
	for _, m := range memberScores {
		result = append(result, memberScoreResponse{
			MemberID:   m.MemberID,
			MemberName: m.Name,
			UserID:     m.UserID,
			WVStatus:   m.WVStatus,
			CIStatus:   m.CIStatus,
			IsAce:      m.IsAce,
			WVScores:   toScores(m.WVScores),
			CIScores:   toScores(m.CIScores),
		})
	}

	return ctx.JSON(http.StatusOK, map[string]any{"members": result})
}

func (c *CompanyTeamController) SetAceMember(ctx echo.Context, teamID, memberID string) error {
	companyID := c.companyID(ctx)
	if _, err := uuid.Parse(teamID); err != nil {
		return badRequest(ctx, "invalid team id")
	}
	if _, err := uuid.Parse(memberID); err != nil {
		return badRequest(ctx, "invalid member id")
	}

	if err := c.input.SetAceMember(ctx.Request().Context(), companyID, teamID, memberID); err != nil {
		return handleError(ctx, err)
	}

	return ctx.NoContent(http.StatusNoContent)
}

func (c *CompanyTeamController) UnsetAceMember(ctx echo.Context, teamID string) error {
	companyID := c.companyID(ctx)
	if _, err := uuid.Parse(teamID); err != nil {
		return badRequest(ctx, "invalid team id")
	}

	if err := c.input.UnsetAceMember(ctx.Request().Context(), companyID, teamID); err != nil {
		return handleError(ctx, err)
	}

	return ctx.NoContent(http.StatusNoContent)
}

type publicTeamScoreResponse struct {
	TeamID         string             `json:"team_id"`
	TeamName       string             `json:"team_name"`
	WVScores       []publicScoreEntry `json:"wv_scores"`
	WNScores       []publicScoreEntry `json:"wn_scores"`
	CIScores       []publicScoreEntry `json:"ci_scores"`
	MemberCount    int                `json:"member_count"`
	CompletedCount int                `json:"completed_count"`
}

type publicScoreEntry struct {
	ID    string  `json:"id"`
	Score float64 `json:"score"`
}

// toPublicScoreEntries keeps nil as nil: the public response renders missing
// aggregates (too few completed members) as JSON null, not [].
func toPublicScoreEntries(entries []company.PublicScoreEntry) []publicScoreEntry {
	if entries == nil {
		return nil
	}
	result := make([]publicScoreEntry, 0, len(entries))
	for _, e := range entries {
		result = append(result, publicScoreEntry{ID: e.ID, Score: e.Score})
	}
	return result
}

func (c *CompanyTeamController) GetPublicTeamScores(ctx echo.Context, companyID string) error {
	if _, err := uuid.Parse(companyID); err != nil {
		return badRequest(ctx, "invalid company id")
	}

	teams, err := c.input.GetPublicTeamScores(ctx.Request().Context(), companyID)
	if err != nil {
		return handleError(ctx, err)
	}

	result := make([]publicTeamScoreResponse, 0, len(teams))
	for _, t := range teams {
		result = append(result, publicTeamScoreResponse{
			TeamID:         t.TeamID,
			TeamName:       t.TeamName,
			WVScores:       toPublicScoreEntries(t.WVScores),
			WNScores:       toPublicScoreEntries(t.WNScores),
			CIScores:       toPublicScoreEntries(t.CIScores),
			MemberCount:    t.MemberCount,
			CompletedCount: t.CompletedCount,
		})
	}

	return ctx.JSON(http.StatusOK, map[string]any{"teams": result})
}
