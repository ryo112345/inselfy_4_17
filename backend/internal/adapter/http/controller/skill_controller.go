package controller

import (
	"context"
	"net/http"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// SkillController handles skill HTTP endpoints.
type SkillController struct {
	input port.SkillInputPort
}

// NewSkillController creates a SkillController.
func NewSkillController(
	input port.SkillInputPort,
) *SkillController {
	return &SkillController{input: input}
}

// List handles GET /api/users/{username}/skills.
func (c *SkillController) List(ctx context.Context, req openapi.SkillsListSkillsRequestObject) (openapi.SkillsListSkillsResponseObject, error) {
	list, err := c.input.List(ctx, req.Username)
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.SkillsListSkills404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.SkillsListSkills400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.SkillsListSkills200JSONResponse(presenter.SkillsResponse(list)), nil
}

// Attach handles POST /api/users/{username}/skills.
func (c *SkillController) Attach(ctx context.Context, req openapi.SkillsAttachSkillRequestObject) (openapi.SkillsAttachSkillResponseObject, error) {
	s, err := c.input.Attach(ctx, authmw.UserIDFromContext(ctx), req.Username, req.Body.Name)
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.SkillsAttachSkill404JSONResponse(notFoundBody(err)), nil
		case http.StatusForbidden:
			return openapi.SkillsAttachSkill403JSONResponse(forbiddenBody(err)), nil
		case http.StatusConflict:
			return openapi.SkillsAttachSkill409JSONResponse(conflictBody(err)), nil
		case http.StatusBadRequest:
			return openapi.SkillsAttachSkill400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.SkillsAttachSkill201JSONResponse(presenter.SkillResponse(s)), nil
}

// Detach handles DELETE /api/users/{username}/skills/{name}.
func (c *SkillController) Detach(ctx context.Context, req openapi.SkillsDetachSkillRequestObject) (openapi.SkillsDetachSkillResponseObject, error) {
	if err := c.input.DetachByName(ctx, authmw.UserIDFromContext(ctx), req.Username, req.Name); err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.SkillsDetachSkill404JSONResponse(notFoundBody(err)), nil
		case http.StatusForbidden:
			return openapi.SkillsDetachSkill403JSONResponse(forbiddenBody(err)), nil
		case http.StatusBadRequest:
			return openapi.SkillsDetachSkill400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.SkillsDetachSkill204Response{}, nil
}
