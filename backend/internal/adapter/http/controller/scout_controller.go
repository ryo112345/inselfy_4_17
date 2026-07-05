package controller

import (
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"

	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/domain/scout"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// ScoutController handles company-side scout HTTP endpoints.
type ScoutController struct {
	input port.ScoutInputPort
}

// NewScoutController creates a ScoutController.
func NewScoutController(input port.ScoutInputPort) *ScoutController {
	return &ScoutController{input: input}
}

type sendScoutRequest struct {
	CandidateID  string  `json:"candidateId"`
	JobPostingID *string `json:"jobPostingId"`
	TemplateID   *string `json:"templateId"`
	Subject      string  `json:"subject"`
	Body         string  `json:"body"`
}

type companyReplyRequest struct {
	Body string `json:"body"`
}

// Send handles POST /api/company/scouts.
func (c *ScoutController) Send(ctx echo.Context) error {
	companyID := authmw.CompanyID(ctx)

	var body sendScoutRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request body")
	}

	msg, err := c.input.Send(ctx.Request().Context(), scout.SendScoutInput{
		CompanyID:    companyID,
		CandidateID:  body.CandidateID,
		JobPostingID: body.JobPostingID,
		TemplateID:   body.TemplateID,
		Subject:      body.Subject,
		Body:         body.Body,
	})
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, presenter.ScoutMessageResponse(msg))
}

// List handles GET /api/company/scouts.
func (c *ScoutController) List(ctx echo.Context) error {
	companyID := authmw.CompanyID(ctx)

	var status *string
	if s := ctx.QueryParam("status"); s != "" {
		status = &s
	}
	limit, _ := strconv.Atoi(ctx.QueryParam("limit"))
	offset, _ := strconv.Atoi(ctx.QueryParam("offset"))

	msgs, total, err := c.input.ListByCompany(ctx.Request().Context(), companyID, status, limit, offset)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.ScoutMessagesResponse(msgs, total))
}

// GetDetail handles GET /api/company/scouts/:scoutID.
func (c *ScoutController) GetDetail(ctx echo.Context, scoutID string) error {
	companyID := authmw.CompanyID(ctx)

	msg, replies, err := c.input.GetDetail(ctx.Request().Context(), companyID, scoutID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.ScoutDetailResponse(msg, replies))
}

// GetCredits handles GET /api/company/scouts/credits.
func (c *ScoutController) GetCredits(ctx echo.Context) error {
	companyID := authmw.CompanyID(ctx)

	credit, err := c.input.GetCredits(ctx.Request().Context(), companyID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.ScoutCreditsResponse(credit))
}

// GetQualityScore handles GET /api/company/scouts/quality.
func (c *ScoutController) GetQualityScore(ctx echo.Context) error {
	companyID := authmw.CompanyID(ctx)

	quality, err := c.input.GetQualityScore(ctx.Request().Context(), companyID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.ScoutQualityResponse(quality))
}

// GetDashboard handles GET /api/company/scouts/dashboard.
func (c *ScoutController) GetDashboard(ctx echo.Context) error {
	companyID := authmw.CompanyID(ctx)

	stats, err := c.input.GetDashboard(ctx.Request().Context(), companyID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.ScoutDashboardResponse(stats))
}

// Reply handles POST /api/company/scouts/:scoutID/replies.
func (c *ScoutController) Reply(ctx echo.Context, scoutID string) error {
	companyID := authmw.CompanyID(ctx)

	var body companyReplyRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request body")
	}

	if err := c.input.CompanyReply(ctx.Request().Context(), companyID, scoutID, body.Body); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, nil)
}
