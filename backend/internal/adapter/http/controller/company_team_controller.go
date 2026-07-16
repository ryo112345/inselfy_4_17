package controller

import (
	"context"
	"net/http"

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

// ListTeams handles GET /api/company/teams.
func (c *CompanyTeamController) ListTeams(ctx context.Context, _ openapi.CompanyTeamsListTeamsRequestObject) (openapi.CompanyTeamsListTeamsResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)

	summaries, err := c.input.ListTeams(ctx, companyID)
	if err != nil {
		if errorStatus(err) == http.StatusBadRequest {
			return openapi.CompanyTeamsListTeams400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CompanyTeamsListTeams200JSONResponse(*presenter.CompanyTeamsResponse(summaries)), nil
}

// CreateTeam handles POST /api/company/teams.
func (c *CompanyTeamController) CreateTeam(ctx context.Context, req openapi.CompanyTeamsCreateTeamRequestObject) (openapi.CompanyTeamsCreateTeamResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)
	if req.Body == nil {
		return openapi.CompanyTeamsCreateTeam400JSONResponse(badRequestBody("invalid request")), nil
	}

	team, err := c.input.CreateTeam(ctx, companyID, req.Body.Name, req.Body.Description)
	if err != nil {
		if errorStatus(err) == http.StatusBadRequest {
			return openapi.CompanyTeamsCreateTeam400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CompanyTeamsCreateTeam201JSONResponse(*presenter.TeamDetailResponse(*team, nil)), nil
}

// GetTeam handles GET /api/company/teams/{teamId}.
func (c *CompanyTeamController) GetTeam(ctx context.Context, req openapi.CompanyTeamsGetTeamRequestObject) (openapi.CompanyTeamsGetTeamResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)

	team, err := c.input.GetTeam(ctx, companyID, req.TeamId)
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.CompanyTeamsGetTeam404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CompanyTeamsGetTeam400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CompanyTeamsGetTeam200JSONResponse(*presenter.TeamDetailResponse(team.Team, team.Members)), nil
}

// UpdateTeam handles PUT /api/company/teams/{teamId}.
func (c *CompanyTeamController) UpdateTeam(ctx context.Context, req openapi.CompanyTeamsUpdateTeamRequestObject) (openapi.CompanyTeamsUpdateTeamResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)
	if req.Body == nil {
		return openapi.CompanyTeamsUpdateTeam400JSONResponse(badRequestBody("invalid request")), nil
	}

	if err := c.input.UpdateTeam(ctx, companyID, req.TeamId, req.Body.Name, req.Body.Description, req.Body.IsPublic); err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.CompanyTeamsUpdateTeam404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CompanyTeamsUpdateTeam400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CompanyTeamsUpdateTeam204Response{}, nil
}

// DeleteTeam handles DELETE /api/company/teams/{teamId}.
func (c *CompanyTeamController) DeleteTeam(ctx context.Context, req openapi.CompanyTeamsDeleteTeamRequestObject) (openapi.CompanyTeamsDeleteTeamResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)

	if err := c.input.DeleteTeam(ctx, companyID, req.TeamId); err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.CompanyTeamsDeleteTeam404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CompanyTeamsDeleteTeam400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CompanyTeamsDeleteTeam204Response{}, nil
}

// AddMember handles POST /api/company/teams/{teamId}/members.
func (c *CompanyTeamController) AddMember(ctx context.Context, req openapi.CompanyTeamsAddTeamMemberRequestObject) (openapi.CompanyTeamsAddTeamMemberResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)
	if req.Body == nil {
		return openapi.CompanyTeamsAddTeamMember400JSONResponse(badRequestBody("invalid request")), nil
	}

	member, err := c.input.AddMember(ctx, companyID, req.TeamId, req.Body.Name, req.Body.Email)
	if err != nil {
		switch errorStatus(err) {
		case http.StatusForbidden:
			return openapi.CompanyTeamsAddTeamMember403JSONResponse(forbiddenBody(err)), nil
		case http.StatusNotFound:
			return openapi.CompanyTeamsAddTeamMember404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CompanyTeamsAddTeamMember400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CompanyTeamsAddTeamMember201JSONResponse(presenter.TeamMemberResponse(*member)), nil
}

// RemoveMember handles DELETE /api/company/teams/{teamId}/members/{memberId}.
func (c *CompanyTeamController) RemoveMember(ctx context.Context, req openapi.CompanyTeamsRemoveTeamMemberRequestObject) (openapi.CompanyTeamsRemoveTeamMemberResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)

	if err := c.input.RemoveMember(ctx, companyID, req.TeamId, req.MemberId); err != nil {
		switch errorStatus(err) {
		case http.StatusForbidden:
			return openapi.CompanyTeamsRemoveTeamMember403JSONResponse(forbiddenBody(err)), nil
		case http.StatusNotFound:
			return openapi.CompanyTeamsRemoveTeamMember404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CompanyTeamsRemoveTeamMember400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CompanyTeamsRemoveTeamMember204Response{}, nil
}

// GetTeamScores handles GET /api/company/teams/{teamId}/scores.
func (c *CompanyTeamController) GetTeamScores(ctx context.Context, req openapi.CompanyTeamsGetTeamScoresRequestObject) (openapi.CompanyTeamsGetTeamScoresResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)

	memberScores, err := c.input.GetTeamScores(ctx, companyID, req.TeamId)
	if err != nil {
		switch errorStatus(err) {
		case http.StatusForbidden:
			return openapi.CompanyTeamsGetTeamScores403JSONResponse(forbiddenBody(err)), nil
		case http.StatusNotFound:
			return openapi.CompanyTeamsGetTeamScores404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CompanyTeamsGetTeamScores400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CompanyTeamsGetTeamScores200JSONResponse(*presenter.TeamScoresResponse(memberScores)), nil
}

// SetAceMember handles PUT /api/company/teams/{teamId}/ace/{memberId}.
func (c *CompanyTeamController) SetAceMember(ctx context.Context, req openapi.CompanyTeamsSetAceMemberRequestObject) (openapi.CompanyTeamsSetAceMemberResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)

	if err := c.input.SetAceMember(ctx, companyID, req.TeamId, req.MemberId); err != nil {
		switch errorStatus(err) {
		case http.StatusForbidden:
			return openapi.CompanyTeamsSetAceMember403JSONResponse(forbiddenBody(err)), nil
		case http.StatusNotFound:
			return openapi.CompanyTeamsSetAceMember404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CompanyTeamsSetAceMember400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CompanyTeamsSetAceMember204Response{}, nil
}

// UnsetAceMember handles DELETE /api/company/teams/{teamId}/ace.
func (c *CompanyTeamController) UnsetAceMember(ctx context.Context, req openapi.CompanyTeamsUnsetAceMemberRequestObject) (openapi.CompanyTeamsUnsetAceMemberResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)

	if err := c.input.UnsetAceMember(ctx, companyID, req.TeamId); err != nil {
		switch errorStatus(err) {
		case http.StatusForbidden:
			return openapi.CompanyTeamsUnsetAceMember403JSONResponse(forbiddenBody(err)), nil
		case http.StatusNotFound:
			return openapi.CompanyTeamsUnsetAceMember404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CompanyTeamsUnsetAceMember400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CompanyTeamsUnsetAceMember204Response{}, nil
}

// GetPublicTeamScores handles GET /api/companies/{id}/teams/scores.
func (c *CompanyTeamController) GetPublicTeamScores(ctx context.Context, req openapi.PublicTeamScoresGetPublicTeamScoresRequestObject) (openapi.PublicTeamScoresGetPublicTeamScoresResponseObject, error) {
	teams, err := c.input.GetPublicTeamScores(ctx, req.Id)
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.PublicTeamScoresGetPublicTeamScores404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.PublicTeamScoresGetPublicTeamScores400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.PublicTeamScoresGetPublicTeamScores200JSONResponse(*presenter.PublicTeamScoresResponse(teams)), nil
}
