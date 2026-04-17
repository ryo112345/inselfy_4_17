package controller

import (
	"net/http"

	"github.com/labstack/echo/v4"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/domain/education"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// EducationController handles education HTTP endpoints.
type EducationController struct {
	inputFactory func(
		repo port.EducationRepository,
		userRepo port.UserRepository,
		output port.EducationOutputPort,
	) port.EducationInputPort
	outputFactory   func() *presenter.EducationPresenter
	repoFactory     func() port.EducationRepository
	userRepoFactory func() port.UserRepository
}

// NewEducationController creates an EducationController.
func NewEducationController(
	inputFactory func(
		repo port.EducationRepository,
		userRepo port.UserRepository,
		output port.EducationOutputPort,
	) port.EducationInputPort,
	outputFactory func() *presenter.EducationPresenter,
	repoFactory func() port.EducationRepository,
	userRepoFactory func() port.UserRepository,
) *EducationController {
	return &EducationController{
		inputFactory:    inputFactory,
		outputFactory:   outputFactory,
		repoFactory:     repoFactory,
		userRepoFactory: userRepoFactory,
	}
}

// List handles GET /api/users/:username/educations.
func (c *EducationController) List(ctx echo.Context, username string) error {
	in, p := c.newIO()
	if err := in.List(ctx.Request().Context(), username); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.List())
}

// Create handles POST /api/users/:username/educations.
func (c *EducationController) Create(ctx echo.Context, username string) error {
	var body openapi.ModelsCreateEducationRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid body")
	}
	in, p := c.newIO()
	if err := in.Create(ctx.Request().Context(), username, toCreateEducationInput(body)); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, p.Single())
}

// Update handles PUT /api/users/:username/educations/:educationId.
func (c *EducationController) Update(ctx echo.Context, username, educationID string) error {
	var body openapi.ModelsUpdateEducationRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid body")
	}
	in, p := c.newIO()
	if err := in.Update(ctx.Request().Context(), username, educationID, toUpdateEducationInput(body)); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.Single())
}

// Delete handles DELETE /api/users/:username/educations/:educationId.
func (c *EducationController) Delete(ctx echo.Context, username, educationID string) error {
	in, _ := c.newIO()
	if err := in.Delete(ctx.Request().Context(), username, educationID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.NoContent(http.StatusNoContent)
}

func (c *EducationController) newIO() (port.EducationInputPort, *presenter.EducationPresenter) {
	output := c.outputFactory()
	input := c.inputFactory(c.repoFactory(), c.userRepoFactory(), output)
	return input, output
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
