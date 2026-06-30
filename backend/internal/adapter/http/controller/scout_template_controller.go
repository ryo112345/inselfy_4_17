package controller

import (
	"net/http"

	"github.com/labstack/echo/v4"

	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/domain/scout"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// ScoutTemplateController handles scout template CRUD HTTP endpoints.
type ScoutTemplateController struct {
	inputFactory  func(repo port.ScoutTemplateRepository, output port.ScoutTemplateOutputPort) port.ScoutTemplateInputPort
	outputFactory func() *presenter.ScoutTemplatePresenter
	repoFactory   func() port.ScoutTemplateRepository
}

// NewScoutTemplateController creates a ScoutTemplateController.
func NewScoutTemplateController(
	inputFactory func(repo port.ScoutTemplateRepository, output port.ScoutTemplateOutputPort) port.ScoutTemplateInputPort,
	outputFactory func() *presenter.ScoutTemplatePresenter,
	repoFactory func() port.ScoutTemplateRepository,
) *ScoutTemplateController {
	return &ScoutTemplateController{
		inputFactory:  inputFactory,
		outputFactory: outputFactory,
		repoFactory:   repoFactory,
	}
}

type createTemplateRequest struct {
	Name    string `json:"name"`
	Subject string `json:"subject"`
	Body    string `json:"body"`
}

type updateTemplateRequest struct {
	Name    string `json:"name"`
	Subject string `json:"subject"`
	Body    string `json:"body"`
}

// Create handles POST /api/company/scout-templates.
func (c *ScoutTemplateController) Create(ctx echo.Context) error {
	companyID := authmw.CompanyID(ctx)

	var body createTemplateRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request body")
	}

	input, p := c.newIO()
	if err := input.Create(ctx.Request().Context(), scout.CreateTemplateInput{
		CompanyID: companyID,
		Name:      body.Name,
		Subject:   body.Subject,
		Body:      body.Body,
	}); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, p.SingleResponse())
}

// List handles GET /api/company/scout-templates.
func (c *ScoutTemplateController) List(ctx echo.Context) error {
	companyID := authmw.CompanyID(ctx)

	input, p := c.newIO()
	if err := input.List(ctx.Request().Context(), companyID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.ListResponse())
}

// Get handles GET /api/company/scout-templates/:templateID.
func (c *ScoutTemplateController) Get(ctx echo.Context, templateID string) error {
	companyID := authmw.CompanyID(ctx)

	input, p := c.newIO()
	if err := input.Get(ctx.Request().Context(), companyID, templateID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.SingleResponse())
}

// Update handles PUT /api/company/scout-templates/:templateID.
func (c *ScoutTemplateController) Update(ctx echo.Context, templateID string) error {
	companyID := authmw.CompanyID(ctx)

	var body updateTemplateRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request body")
	}

	input, p := c.newIO()
	if err := input.Update(ctx.Request().Context(), companyID, templateID, scout.UpdateTemplateInput{
		Name:    body.Name,
		Subject: body.Subject,
		Body:    body.Body,
	}); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.SingleResponse())
}

// Delete handles DELETE /api/company/scout-templates/:templateID.
func (c *ScoutTemplateController) Delete(ctx echo.Context, templateID string) error {
	companyID := authmw.CompanyID(ctx)

	input, _ := c.newIO()
	if err := input.Delete(ctx.Request().Context(), companyID, templateID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.NoContent(http.StatusNoContent)
}

func (c *ScoutTemplateController) newIO() (port.ScoutTemplateInputPort, *presenter.ScoutTemplatePresenter) {
	output := c.outputFactory()
	input := c.inputFactory(c.repoFactory(), output)
	return input, output
}
