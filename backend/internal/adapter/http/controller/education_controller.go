package controller

import (
	"net/http"

	"github.com/labstack/echo/v4"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/domain/education"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// EducationController handles education HTTP endpoints.
type EducationController struct {
	input port.EducationInputPort
}

// NewEducationController creates an EducationController.
func NewEducationController(
	input port.EducationInputPort,
) *EducationController {
	return &EducationController{input: input}
}

// List handles GET /api/users/:username/educations.
func (c *EducationController) List(ctx echo.Context, username string) error {
	es, err := c.input.List(ctx.Request().Context(), username)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.EducationsResponse(es))
}

// Create handles POST /api/users/:username/educations.
func (c *EducationController) Create(ctx echo.Context, username string) error {
	var body openapi.ModelsCreateEducationRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid body")
	}
	e, err := c.input.Create(ctx.Request().Context(), authmw.UserID(ctx), username, toCreateEducationInput(body))
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, presenter.EducationResponse(e))
}

// Update handles PUT /api/users/:username/educations/:educationId.
func (c *EducationController) Update(ctx echo.Context, username, educationID string) error {
	var body openapi.ModelsUpdateEducationRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid body")
	}
	e, err := c.input.Update(ctx.Request().Context(), authmw.UserID(ctx), username, educationID, toUpdateEducationInput(body))
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.EducationResponse(e))
}

// Delete handles DELETE /api/users/:username/educations/:educationId.
func (c *EducationController) Delete(ctx echo.Context, username, educationID string) error {
	if err := c.input.Delete(ctx.Request().Context(), authmw.UserID(ctx), username, educationID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.NoContent(http.StatusNoContent)
}

func toCreateEducationInput(body openapi.ModelsCreateEducationRequest) education.CreateInput {
	return education.CreateInput{
		School:    body.School,
		Degree:    body.Degree,
		StartYear: int32PtrToInt16Ptr(body.StartYear),
		EndYear:   int32PtrToInt16Ptr(body.EndYear),
	}
}

func toUpdateEducationInput(body openapi.ModelsUpdateEducationRequest) education.UpdateInput {
	return education.UpdateInput{
		School:    body.School,
		Degree:    body.Degree,
		StartYear: int32PtrToInt16Ptr(body.StartYear),
		EndYear:   int32PtrToInt16Ptr(body.EndYear),
	}
}
