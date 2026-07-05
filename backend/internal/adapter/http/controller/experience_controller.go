package controller

import (
	"net/http"

	"github.com/labstack/echo/v4"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/domain/experience"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// ExperienceController handles experience HTTP endpoints.
type ExperienceController struct {
	input port.ExperienceInputPort
}

// NewExperienceController creates an ExperienceController.
func NewExperienceController(
	input port.ExperienceInputPort,
) *ExperienceController {
	return &ExperienceController{input: input}
}

// List handles GET /api/users/:username/experiences.
func (c *ExperienceController) List(ctx echo.Context, username string) error {
	list, err := c.input.List(ctx.Request().Context(), username)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.ExperiencesResponse(list))
}

// Create handles POST /api/users/:username/experiences.
func (c *ExperienceController) Create(ctx echo.Context, username string) error {
	var body openapi.ModelsCreateExperienceRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid body")
	}
	e, err := c.input.Create(ctx.Request().Context(), username, toCreateExperienceInput(body))
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, presenter.ExperienceResponse(e))
}

// Update handles PUT /api/users/:username/experiences/:experienceId.
func (c *ExperienceController) Update(ctx echo.Context, username, experienceID string) error {
	var body openapi.ModelsUpdateExperienceRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid body")
	}
	e, err := c.input.Update(ctx.Request().Context(), username, experienceID, toUpdateExperienceInput(body))
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.ExperienceResponse(e))
}

// Delete handles DELETE /api/users/:username/experiences/:experienceId.
func (c *ExperienceController) Delete(ctx echo.Context, username, experienceID string) error {
	if err := c.input.Delete(ctx.Request().Context(), username, experienceID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.NoContent(http.StatusNoContent)
}

func toCreateExperienceInput(body openapi.ModelsCreateExperienceRequest) experience.CreateInput {
	return experience.CreateInput{
		CompanyName: body.CompanyName,
		Title:       body.Title,
		StartYear:   int16(body.StartYear),
		StartMonth:  int16(body.StartMonth),
		EndYear:     int32PtrToInt16Ptr(body.EndYear),
		EndMonth:    int32PtrToInt16Ptr(body.EndMonth),
		IsCurrent:   body.IsCurrent,
		Description: derefString(body.Description),
	}
}

func toUpdateExperienceInput(body openapi.ModelsUpdateExperienceRequest) experience.UpdateInput {
	return experience.UpdateInput{
		CompanyName: body.CompanyName,
		Title:       body.Title,
		StartYear:   int16(body.StartYear),
		StartMonth:  int16(body.StartMonth),
		EndYear:     int32PtrToInt16Ptr(body.EndYear),
		EndMonth:    int32PtrToInt16Ptr(body.EndMonth),
		IsCurrent:   body.IsCurrent,
		Description: derefString(body.Description),
	}
}

func int32PtrToInt16Ptr(v *int32) *int16 {
	if v == nil {
		return nil
	}
	n := int16(*v)
	return &n
}

func derefString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
