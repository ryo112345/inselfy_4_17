package controller

import (
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"

	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/domain/jobapplication"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type JobApplicationController struct {
	inputFactory   func(repo port.JobApplicationRepository, jobRepo port.JobPostingRepository, output port.JobApplicationOutputPort) port.JobApplicationInputPort
	outputFactory  func() *presenter.JobApplicationPresenter
	repoFactory    func() port.JobApplicationRepository
	jobRepoFactory func() port.JobPostingRepository
}

func NewJobApplicationController(
	inputFactory func(repo port.JobApplicationRepository, jobRepo port.JobPostingRepository, output port.JobApplicationOutputPort) port.JobApplicationInputPort,
	outputFactory func() *presenter.JobApplicationPresenter,
	repoFactory func() port.JobApplicationRepository,
	jobRepoFactory func() port.JobPostingRepository,
) *JobApplicationController {
	return &JobApplicationController{
		inputFactory:   inputFactory,
		outputFactory:  outputFactory,
		repoFactory:    repoFactory,
		jobRepoFactory: jobRepoFactory,
	}
}

func (c *JobApplicationController) newIO() (port.JobApplicationInputPort, *presenter.JobApplicationPresenter) {
	output := c.outputFactory()
	input := c.inputFactory(c.repoFactory(), c.jobRepoFactory(), output)
	return input, output
}

type applyRequest struct {
	JobPostingID string `json:"jobPostingId"`
	Message      string `json:"message"`
}

type updateStatusRequest struct {
	Status string `json:"status"`
}

func (c *JobApplicationController) Apply(ctx echo.Context) error {
	userID, ok := ctx.Get(authmw.UserIDKey).(string)
	if !ok || userID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	var body applyRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request body")
	}
	if body.JobPostingID == "" {
		return badRequest(ctx, "jobPostingId is required")
	}

	input, p := c.newIO()
	if err := input.Apply(ctx.Request().Context(), jobapplication.ApplyInput{
		JobPostingID: body.JobPostingID,
		CandidateID:  userID,
		Message:      body.Message,
	}); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, p.SingleResponse())
}

func (c *JobApplicationController) ListByCompany(ctx echo.Context) error {
	companyID, ok := ctx.Get(authmw.CompanyIDKey).(string)
	if !ok || companyID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	var status *string
	if s := ctx.QueryParam("status"); s != "" {
		status = &s
	}
	limit, _ := strconv.Atoi(ctx.QueryParam("limit"))
	offset, _ := strconv.Atoi(ctx.QueryParam("offset"))

	input, p := c.newIO()
	if err := input.ListByCompany(ctx.Request().Context(), companyID, status, limit, offset); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.ListResponse())
}

func (c *JobApplicationController) ListByCandidate(ctx echo.Context) error {
	userID, ok := ctx.Get(authmw.UserIDKey).(string)
	if !ok || userID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	input, p := c.newIO()
	if err := input.ListByCandidate(ctx.Request().Context(), userID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.ListResponse())
}

func (c *JobApplicationController) GetByID(ctx echo.Context, applicationID string) error {
	companyID, ok := ctx.Get(authmw.CompanyIDKey).(string)
	if !ok || companyID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	input, p := c.newIO()
	if err := input.GetByID(ctx.Request().Context(), companyID, applicationID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.SingleResponse())
}

func (c *JobApplicationController) UpdateStatus(ctx echo.Context, applicationID string) error {
	companyID, ok := ctx.Get(authmw.CompanyIDKey).(string)
	if !ok || companyID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	var body updateStatusRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request body")
	}

	input, p := c.newIO()
	if err := input.UpdateStatus(ctx.Request().Context(), companyID, applicationID, jobapplication.Status(body.Status)); err != nil {
		return handleError(ctx, err)
	}
	_ = p
	return ctx.JSON(http.StatusOK, map[string]string{"status": "ok"})
}

func (c *JobApplicationController) Withdraw(ctx echo.Context, applicationID string) error {
	userID, ok := ctx.Get(authmw.UserIDKey).(string)
	if !ok || userID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	input, p := c.newIO()
	if err := input.Withdraw(ctx.Request().Context(), userID, applicationID); err != nil {
		return handleError(ctx, err)
	}
	_ = p
	return ctx.JSON(http.StatusOK, map[string]string{"status": "ok"})
}

func (c *JobApplicationController) CheckApplied(ctx echo.Context) error {
	userID, ok := ctx.Get(authmw.UserIDKey).(string)
	if !ok || userID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	jobPostingID := ctx.QueryParam("jobPostingId")
	if jobPostingID == "" {
		return badRequest(ctx, "jobPostingId is required")
	}

	input, p := c.newIO()
	if err := input.CheckApplied(ctx.Request().Context(), userID, jobPostingID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.AppliedResponse())
}
