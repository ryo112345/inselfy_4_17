package controller

import (
	"net/http"
	"strconv"
	"time"

	"github.com/labstack/echo/v4"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/domain/jobapplication"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type JobApplicationController struct {
	input port.JobApplicationInputPort
}

func NewJobApplicationController(input port.JobApplicationInputPort) *JobApplicationController {
	return &JobApplicationController{input: input}
}

func (c *JobApplicationController) Apply(ctx echo.Context) error {
	userID := authmw.UserID(ctx)

	var body openapi.ModelsApplyJobRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request body")
	}
	if body.JobPostingId == "" {
		return badRequest(ctx, "jobPostingId is required")
	}

	a, err := c.input.Apply(ctx.Request().Context(), jobapplication.ApplyInput{
		JobPostingID: body.JobPostingId,
		CandidateID:  userID,
		Message:      body.Message,
	})
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, presenter.JobApplicationSingleResponse(a))
}

func (c *JobApplicationController) ListByCompany(ctx echo.Context) error {
	companyID := authmw.CompanyID(ctx)

	filter := jobapplication.ListFilter{}
	if s := ctx.QueryParam("status"); s != "" {
		filter.Status = &s
	}
	if jp := ctx.QueryParam("job_posting_id"); jp != "" {
		filter.JobPostingID = &jp
	}
	if kw := ctx.QueryParam("keyword"); kw != "" {
		filter.Keyword = &kw
	}
	if df := ctx.QueryParam("date_from"); df != "" {
		if t, err := time.Parse(time.RFC3339, df); err == nil {
			filter.DateFrom = &t
		}
	}
	if dt := ctx.QueryParam("date_to"); dt != "" {
		if t, err := time.Parse(time.RFC3339, dt); err == nil {
			filter.DateTo = &t
		}
	}
	filter.Limit, _ = strconv.Atoi(ctx.QueryParam("limit"))
	filter.Offset, _ = strconv.Atoi(ctx.QueryParam("offset"))

	apps, total, err := c.input.ListByCompany(ctx.Request().Context(), companyID, filter)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.JobApplicationsListResponse(apps, total))
}

func (c *JobApplicationController) ListByCandidate(ctx echo.Context) error {
	userID := authmw.UserID(ctx)

	apps, total, err := c.input.ListByCandidate(ctx.Request().Context(), userID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.JobApplicationsListResponse(apps, total))
}

func (c *JobApplicationController) GetByID(ctx echo.Context, applicationID string) error {
	companyID := authmw.CompanyID(ctx)

	a, err := c.input.GetByID(ctx.Request().Context(), companyID, applicationID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.JobApplicationSingleResponse(a))
}

func (c *JobApplicationController) UpdateStatus(ctx echo.Context, applicationID string) error {
	companyID := authmw.CompanyID(ctx)

	var body openapi.ModelsUpdateApplicationStatusRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request body")
	}

	if err := c.input.UpdateStatus(ctx.Request().Context(), companyID, applicationID, jobapplication.Status(body.Status)); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, openapi.ModelsStatusOkResponse{Status: "ok"})
}

func (c *JobApplicationController) Withdraw(ctx echo.Context, applicationID string) error {
	userID := authmw.UserID(ctx)

	if err := c.input.Withdraw(ctx.Request().Context(), userID, applicationID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, openapi.ModelsStatusOkResponse{Status: "ok"})
}

func (c *JobApplicationController) CheckApplied(ctx echo.Context) error {
	userID := authmw.UserID(ctx)

	jobPostingID := ctx.QueryParam("jobPostingId")
	if jobPostingID == "" {
		return badRequest(ctx, "jobPostingId is required")
	}

	applied, err := c.input.CheckApplied(ctx.Request().Context(), userID, jobPostingID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.JobApplicationAppliedResponse(applied))
}
