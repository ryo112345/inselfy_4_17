package controller

import (
	"net/http"

	"github.com/labstack/echo/v4"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
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

// List handles GET /api/users/:username/skills.
func (c *SkillController) List(ctx echo.Context, username string) error {
	list, err := c.input.List(ctx.Request().Context(), username)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.SkillsResponse(list))
}

// Attach handles POST /api/users/:username/skills.
func (c *SkillController) Attach(ctx echo.Context, username string) error {
	var body openapi.ModelsAttachSkillRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid body")
	}
	s, err := c.input.Attach(ctx.Request().Context(), username, body.Name)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, presenter.SkillResponse(s))
}

// Detach handles DELETE /api/users/:username/skills/:name.
func (c *SkillController) Detach(ctx echo.Context, username, name string) error {
	if err := c.input.DetachByName(ctx.Request().Context(), username, name); err != nil {
		return handleError(ctx, err)
	}
	return ctx.NoContent(http.StatusNoContent)
}
