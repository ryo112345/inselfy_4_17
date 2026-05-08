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
	inputFactory func(
		msgRepo port.ScoutMessageRepository,
		creditRepo port.ScoutCreditRepository,
		ledgerRepo port.ScoutCreditLedgerRepository,
		replyRepo port.ScoutReplyRepository,
		settingsRepo port.UserScoutSettingsRepository,
		notifRepo port.NotificationRepository,
		userRepo port.UserRepository,
		convRepo port.ConversationRepository,
		convMsgRepo port.MessageRepository,
		participantRepo port.ConversationParticipantRepository,
		tx port.TxManager,
		output port.ScoutOutputPort,
	) port.ScoutInputPort
	outputFactory          func() *presenter.ScoutPresenter
	msgRepoFactory         func() port.ScoutMessageRepository
	creditRepoFactory      func() port.ScoutCreditRepository
	ledgerRepoFactory      func() port.ScoutCreditLedgerRepository
	replyRepoFactory       func() port.ScoutReplyRepository
	settingsRepoFactory    func() port.UserScoutSettingsRepository
	notifRepoFactory       func() port.NotificationRepository
	userRepoFactory        func() port.UserRepository
	convRepoFactory        func() port.ConversationRepository
	convMsgRepoFactory     func() port.MessageRepository
	participantRepoFactory func() port.ConversationParticipantRepository
	tx                     port.TxManager
}

// NewScoutController creates a ScoutController.
func NewScoutController(
	inputFactory func(
		msgRepo port.ScoutMessageRepository,
		creditRepo port.ScoutCreditRepository,
		ledgerRepo port.ScoutCreditLedgerRepository,
		replyRepo port.ScoutReplyRepository,
		settingsRepo port.UserScoutSettingsRepository,
		notifRepo port.NotificationRepository,
		userRepo port.UserRepository,
		convRepo port.ConversationRepository,
		convMsgRepo port.MessageRepository,
		participantRepo port.ConversationParticipantRepository,
		tx port.TxManager,
		output port.ScoutOutputPort,
	) port.ScoutInputPort,
	outputFactory func() *presenter.ScoutPresenter,
	msgRepoFactory func() port.ScoutMessageRepository,
	creditRepoFactory func() port.ScoutCreditRepository,
	ledgerRepoFactory func() port.ScoutCreditLedgerRepository,
	replyRepoFactory func() port.ScoutReplyRepository,
	settingsRepoFactory func() port.UserScoutSettingsRepository,
	notifRepoFactory func() port.NotificationRepository,
	userRepoFactory func() port.UserRepository,
	convRepoFactory func() port.ConversationRepository,
	convMsgRepoFactory func() port.MessageRepository,
	participantRepoFactory func() port.ConversationParticipantRepository,
	tx port.TxManager,
) *ScoutController {
	return &ScoutController{
		inputFactory:           inputFactory,
		outputFactory:          outputFactory,
		msgRepoFactory:         msgRepoFactory,
		creditRepoFactory:      creditRepoFactory,
		ledgerRepoFactory:      ledgerRepoFactory,
		replyRepoFactory:       replyRepoFactory,
		settingsRepoFactory:    settingsRepoFactory,
		notifRepoFactory:       notifRepoFactory,
		userRepoFactory:        userRepoFactory,
		convRepoFactory:        convRepoFactory,
		convMsgRepoFactory:     convMsgRepoFactory,
		participantRepoFactory: participantRepoFactory,
		tx:                     tx,
	}
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
	companyID, ok := ctx.Get(authmw.CompanyIDKey).(string)
	if !ok || companyID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	var body sendScoutRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request body")
	}

	input, p := c.newIO()
	if err := input.Send(ctx.Request().Context(), scout.SendScoutInput{
		CompanyID:    companyID,
		CandidateID:  body.CandidateID,
		JobPostingID: body.JobPostingID,
		TemplateID:   body.TemplateID,
		Subject:      body.Subject,
		Body:         body.Body,
	}); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, p.MessageResponse())
}

// List handles GET /api/company/scouts.
func (c *ScoutController) List(ctx echo.Context) error {
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

// GetDetail handles GET /api/company/scouts/:scoutID.
func (c *ScoutController) GetDetail(ctx echo.Context, scoutID string) error {
	companyID, ok := ctx.Get(authmw.CompanyIDKey).(string)
	if !ok || companyID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	input, p := c.newIO()
	if err := input.GetDetail(ctx.Request().Context(), companyID, scoutID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.DetailResponse())
}

// GetCredits handles GET /api/company/scouts/credits.
func (c *ScoutController) GetCredits(ctx echo.Context) error {
	companyID, ok := ctx.Get(authmw.CompanyIDKey).(string)
	if !ok || companyID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	input, p := c.newIO()
	if err := input.GetCredits(ctx.Request().Context(), companyID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.CreditsResponse())
}

// GetQualityScore handles GET /api/company/scouts/quality.
func (c *ScoutController) GetQualityScore(ctx echo.Context) error {
	companyID, ok := ctx.Get(authmw.CompanyIDKey).(string)
	if !ok || companyID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	input, p := c.newIO()
	if err := input.GetQualityScore(ctx.Request().Context(), companyID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.QualityResponse())
}

// GetDashboard handles GET /api/company/scouts/dashboard.
func (c *ScoutController) GetDashboard(ctx echo.Context) error {
	companyID, ok := ctx.Get(authmw.CompanyIDKey).(string)
	if !ok || companyID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	input, p := c.newIO()
	if err := input.GetDashboard(ctx.Request().Context(), companyID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.DashboardResponse())
}

// Reply handles POST /api/company/scouts/:scoutID/replies.
func (c *ScoutController) Reply(ctx echo.Context, scoutID string) error {
	companyID, ok := ctx.Get(authmw.CompanyIDKey).(string)
	if !ok || companyID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	var body companyReplyRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request body")
	}

	input, p := c.newIO()
	if err := input.CompanyReply(ctx.Request().Context(), companyID, scoutID, body.Body); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, p.DetailResponse())
}

func (c *ScoutController) newIO() (port.ScoutInputPort, *presenter.ScoutPresenter) {
	output := c.outputFactory()
	input := c.inputFactory(
		c.msgRepoFactory(),
		c.creditRepoFactory(),
		c.ledgerRepoFactory(),
		c.replyRepoFactory(),
		c.settingsRepoFactory(),
		c.notifRepoFactory(),
		c.userRepoFactory(),
		c.convRepoFactory(),
		c.convMsgRepoFactory(),
		c.participantRepoFactory(),
		c.tx,
		output,
	)
	return input, output
}
