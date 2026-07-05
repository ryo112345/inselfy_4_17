package controller

import (
	"net/http"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type CompanyTeamController struct {
	input port.CompanyTeamInputPort
}

func NewCompanyTeamController(input port.CompanyTeamInputPort) *CompanyTeamController {
	return &CompanyTeamController{input: input}
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

	return ctx.JSON(http.StatusOK, presenter.CompanyTeamsResponse(summaries))
}

func (c *CompanyTeamController) CreateTeam(ctx echo.Context) error {
	companyID := c.companyID(ctx)
	if _, err := uuid.Parse(companyID); err != nil {
		return badRequest(ctx, "invalid company id")
	}

	var body openapi.ModelsCreateTeamRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request")
	}

	team, err := c.input.CreateTeam(ctx.Request().Context(), companyID, body.Name, body.Description)
	if err != nil {
		return handleError(ctx, err)
	}

	return ctx.JSON(http.StatusCreated, presenter.TeamDetailResponse(*team, nil))
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

	return ctx.JSON(http.StatusOK, presenter.TeamDetailResponse(team.Team, team.Members))
}

func (c *CompanyTeamController) UpdateTeam(ctx echo.Context, teamID string) error {
	companyID := c.companyID(ctx)
	if _, err := uuid.Parse(teamID); err != nil {
		return badRequest(ctx, "invalid team id")
	}

	var body openapi.ModelsUpdateTeamRequest
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

	var body openapi.ModelsAddTeamMemberRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request")
	}

	member, err := c.input.AddMember(ctx.Request().Context(), companyID, teamID, body.Name, body.Email)
	if err != nil {
		return handleError(ctx, err)
	}

	return ctx.JSON(http.StatusCreated, presenter.TeamMemberResponse(*member))
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

func (c *CompanyTeamController) GetTeamScores(ctx echo.Context, teamID string) error {
	companyID := c.companyID(ctx)
	if _, err := uuid.Parse(teamID); err != nil {
		return badRequest(ctx, "invalid team id")
	}

	memberScores, err := c.input.GetTeamScores(ctx.Request().Context(), companyID, teamID)
	if err != nil {
		return handleError(ctx, err)
	}

	return ctx.JSON(http.StatusOK, presenter.TeamScoresResponse(memberScores))
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

func (c *CompanyTeamController) GetPublicTeamScores(ctx echo.Context, companyID string) error {
	if _, err := uuid.Parse(companyID); err != nil {
		return badRequest(ctx, "invalid company id")
	}

	teams, err := c.input.GetPublicTeamScores(ctx.Request().Context(), companyID)
	if err != nil {
		return handleError(ctx, err)
	}

	return ctx.JSON(http.StatusOK, presenter.PublicTeamScoresResponse(teams))
}
