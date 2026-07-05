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
	inputFactory func(repo port.ScoutTemplateRepository) port.ScoutTemplateInputPort
	repoFactory  func() port.ScoutTemplateRepository
}

// NewScoutTemplateController creates a ScoutTemplateController.
func NewScoutTemplateController(
	inputFactory func(repo port.ScoutTemplateRepository) port.ScoutTemplateInputPort,
	repoFactory func() port.ScoutTemplateRepository,
) *ScoutTemplateController {
	return &ScoutTemplateController{
		inputFactory: inputFactory,
		repoFactory:  repoFactory,
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

	t, err := c.newInput().Create(ctx.Request().Context(), scout.CreateTemplateInput{
		CompanyID: companyID,
		Name:      body.Name,
		Subject:   body.Subject,
		Body:      body.Body,
	})
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, presenter.ScoutTemplateResponse(t))
}

// List handles GET /api/company/scout-templates.
func (c *ScoutTemplateController) List(ctx echo.Context) error {
	companyID := authmw.CompanyID(ctx)

	ts, err := c.newInput().List(ctx.Request().Context(), companyID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.ScoutTemplatesResponse(ts))
}

// Get handles GET /api/company/scout-templates/:templateID.
func (c *ScoutTemplateController) Get(ctx echo.Context, templateID string) error {
	companyID := authmw.CompanyID(ctx)

	t, err := c.newInput().Get(ctx.Request().Context(), companyID, templateID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.ScoutTemplateResponse(t))
}

// Update handles PUT /api/company/scout-templates/:templateID.
func (c *ScoutTemplateController) Update(ctx echo.Context, templateID string) error {
	companyID := authmw.CompanyID(ctx)

	var body updateTemplateRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request body")
	}

	t, err := c.newInput().Update(ctx.Request().Context(), companyID, templateID, scout.UpdateTemplateInput{
		Name:    body.Name,
		Subject: body.Subject,
		Body:    body.Body,
	})
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.ScoutTemplateResponse(t))
}

// Delete handles DELETE /api/company/scout-templates/:templateID.
func (c *ScoutTemplateController) Delete(ctx echo.Context, templateID string) error {
	companyID := authmw.CompanyID(ctx)

	if err := c.newInput().Delete(ctx.Request().Context(), companyID, templateID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.NoContent(http.StatusNoContent)
}

func (c *ScoutTemplateController) newInput() port.ScoutTemplateInputPort {
	return c.inputFactory(c.repoFactory())
}
