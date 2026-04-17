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
	inputFactory func(
		repo port.SkillRepository,
		userRepo port.UserRepository,
		tx port.TxManager,
		output port.SkillOutputPort,
	) port.SkillInputPort
	outputFactory   func() *presenter.SkillPresenter
	repoFactory     func() port.SkillRepository
	userRepoFactory func() port.UserRepository
	tx              port.TxManager
}

// NewSkillController creates a SkillController.
func NewSkillController(
	inputFactory func(
		repo port.SkillRepository,
		userRepo port.UserRepository,
		tx port.TxManager,
		output port.SkillOutputPort,
	) port.SkillInputPort,
	outputFactory func() *presenter.SkillPresenter,
	repoFactory func() port.SkillRepository,
	userRepoFactory func() port.UserRepository,
	tx port.TxManager,
) *SkillController {
	return &SkillController{
		inputFactory:    inputFactory,
		outputFactory:   outputFactory,
		repoFactory:     repoFactory,
		userRepoFactory: userRepoFactory,
		tx:              tx,
	}
}

// List handles GET /api/users/:username/skills.
func (c *SkillController) List(ctx echo.Context, username string) error {
	in, p := c.newIO()
	if err := in.List(ctx.Request().Context(), username); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.List())
}

// Attach handles POST /api/users/:username/skills.
func (c *SkillController) Attach(ctx echo.Context, username string) error {
	var body openapi.ModelsAttachSkillRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid body")
	}
	in, p := c.newIO()
	if err := in.Attach(ctx.Request().Context(), username, body.Name); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, p.Single())
}

// Detach handles DELETE /api/users/:username/skills/:name.
func (c *SkillController) Detach(ctx echo.Context, username, name string) error {
	in, _ := c.newIO()
	if err := in.DetachByName(ctx.Request().Context(), username, name); err != nil {
		return handleError(ctx, err)
	}
	return ctx.NoContent(http.StatusNoContent)
}

func (c *SkillController) newIO() (port.SkillInputPort, *presenter.SkillPresenter) {
	output := c.outputFactory()
	input := c.inputFactory(c.repoFactory(), c.userRepoFactory(), c.tx, output)
	return input, output
}
