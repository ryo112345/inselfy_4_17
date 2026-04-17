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
	inputFactory func(
		repo port.ExperienceRepository,
		userRepo port.UserRepository,
		output port.ExperienceOutputPort,
	) port.ExperienceInputPort
	outputFactory    func() *presenter.ExperiencePresenter
	repoFactory      func() port.ExperienceRepository
	userRepoFactory  func() port.UserRepository
}

// NewExperienceController creates an ExperienceController.
func NewExperienceController(
	inputFactory func(
		repo port.ExperienceRepository,
		userRepo port.UserRepository,
		output port.ExperienceOutputPort,
	) port.ExperienceInputPort,
	outputFactory func() *presenter.ExperiencePresenter,
	repoFactory func() port.ExperienceRepository,
	userRepoFactory func() port.UserRepository,
) *ExperienceController {
	return &ExperienceController{
		inputFactory:    inputFactory,
		outputFactory:   outputFactory,
		repoFactory:     repoFactory,
		userRepoFactory: userRepoFactory,
	}
}

// List handles GET /api/users/:username/experiences.
func (c *ExperienceController) List(ctx echo.Context, username string) error {
	in, p := c.newIO()
	if err := in.List(ctx.Request().Context(), username); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.List())
}

// Create handles POST /api/users/:username/experiences.
func (c *ExperienceController) Create(ctx echo.Context, username string) error {
	var body openapi.ModelsCreateExperienceRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid body")
	}
	in, p := c.newIO()
	if err := in.Create(ctx.Request().Context(), username, toCreateExperienceInput(body)); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, p.Single())
}

// Update handles PUT /api/users/:username/experiences/:experienceId.
func (c *ExperienceController) Update(ctx echo.Context, username, experienceID string) error {
	var body openapi.ModelsUpdateExperienceRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid body")
	}
	in, p := c.newIO()
	if err := in.Update(ctx.Request().Context(), username, experienceID, toUpdateExperienceInput(body)); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.Single())
}

// Delete handles DELETE /api/users/:username/experiences/:experienceId.
func (c *ExperienceController) Delete(ctx echo.Context, username, experienceID string) error {
	in, _ := c.newIO()
	if err := in.Delete(ctx.Request().Context(), username, experienceID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.NoContent(http.StatusNoContent)
}

func (c *ExperienceController) newIO() (port.ExperienceInputPort, *presenter.ExperiencePresenter) {
	output := c.outputFactory()
	input := c.inputFactory(c.repoFactory(), c.userRepoFactory(), output)
	return input, output
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
