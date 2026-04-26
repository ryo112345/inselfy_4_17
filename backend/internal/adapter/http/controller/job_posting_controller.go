package controller

import (
	"net/http"

	"github.com/labstack/echo/v4"

	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/domain/jobposting"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// JobPostingController handles job posting CRUD HTTP endpoints.
type JobPostingController struct {
	inputFactory  func(repo port.JobPostingRepository, output port.JobPostingOutputPort) port.JobPostingInputPort
	outputFactory func() *presenter.JobPostingPresenter
	repoFactory   func() port.JobPostingRepository
}

// NewJobPostingController creates a JobPostingController.
func NewJobPostingController(
	inputFactory func(repo port.JobPostingRepository, output port.JobPostingOutputPort) port.JobPostingInputPort,
	outputFactory func() *presenter.JobPostingPresenter,
	repoFactory func() port.JobPostingRepository,
) *JobPostingController {
	return &JobPostingController{
		inputFactory:  inputFactory,
		outputFactory: outputFactory,
		repoFactory:   repoFactory,
	}
}

type createJobPostingRequest struct {
	Title          string  `json:"title"`
	Description    string  `json:"description"`
	EmploymentType string  `json:"employmentType"`
	Location       *string `json:"location"`
}

type updateJobPostingRequest struct {
	Title          string  `json:"title"`
	Description    string  `json:"description"`
	EmploymentType string  `json:"employmentType"`
	Location       *string `json:"location"`
	IsActive       *bool   `json:"isActive"`
}

// Create handles POST /api/company/job-postings.
func (c *JobPostingController) Create(ctx echo.Context) error {
	companyID, ok := ctx.Get(authmw.CompanyIDKey).(string)
	if !ok || companyID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	var body createJobPostingRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request body")
	}

	input, p := c.newIO()
	if err := input.Create(ctx.Request().Context(), jobposting.CreateJobPostingInput{
		CompanyID:      companyID,
		Title:          body.Title,
		Description:    body.Description,
		EmploymentType: body.EmploymentType,
		Location:       body.Location,
	}); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, p.SingleResponse())
}

// List handles GET /api/company/job-postings.
func (c *JobPostingController) List(ctx echo.Context) error {
	companyID, ok := ctx.Get(authmw.CompanyIDKey).(string)
	if !ok || companyID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	input, p := c.newIO()
	if err := input.List(ctx.Request().Context(), companyID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.ListResponse())
}

// Get handles GET /api/company/job-postings/:jobID.
func (c *JobPostingController) Get(ctx echo.Context, jobID string) error {
	companyID, ok := ctx.Get(authmw.CompanyIDKey).(string)
	if !ok || companyID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	input, p := c.newIO()
	if err := input.Get(ctx.Request().Context(), companyID, jobID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.SingleResponse())
}

// Update handles PUT /api/company/job-postings/:jobID.
func (c *JobPostingController) Update(ctx echo.Context, jobID string) error {
	companyID, ok := ctx.Get(authmw.CompanyIDKey).(string)
	if !ok || companyID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	var body updateJobPostingRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request body")
	}

	input, p := c.newIO()
	if err := input.Update(ctx.Request().Context(), companyID, jobID, jobposting.UpdateJobPostingInput{
		Title:          body.Title,
		Description:    body.Description,
		EmploymentType: body.EmploymentType,
		Location:       body.Location,
		IsActive:       body.IsActive,
	}); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.SingleResponse())
}

// Delete handles DELETE /api/company/job-postings/:jobID.
func (c *JobPostingController) Delete(ctx echo.Context, jobID string) error {
	companyID, ok := ctx.Get(authmw.CompanyIDKey).(string)
	if !ok || companyID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	input, _ := c.newIO()
	if err := input.Delete(ctx.Request().Context(), companyID, jobID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.NoContent(http.StatusNoContent)
}

func (c *JobPostingController) newIO() (port.JobPostingInputPort, *presenter.JobPostingPresenter) {
	output := c.outputFactory()
	input := c.inputFactory(c.repoFactory(), output)
	return input, output
}
