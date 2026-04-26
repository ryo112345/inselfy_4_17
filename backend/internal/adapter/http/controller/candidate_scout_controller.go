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

// CandidateScoutController handles candidate-side scout HTTP endpoints.
type CandidateScoutController struct {
	inputFactory func(
		msgRepo port.ScoutMessageRepository,
		creditRepo port.ScoutCreditRepository,
		ledgerRepo port.ScoutCreditLedgerRepository,
		replyRepo port.ScoutReplyRepository,
		settingsRepo port.UserScoutSettingsRepository,
		notifRepo port.NotificationRepository,
		userRepo port.UserRepository,
		tx port.TxManager,
		output port.ScoutOutputPort,
	) port.ScoutInputPort
	outputFactory       func() *presenter.ScoutPresenter
	msgRepoFactory      func() port.ScoutMessageRepository
	creditRepoFactory   func() port.ScoutCreditRepository
	ledgerRepoFactory   func() port.ScoutCreditLedgerRepository
	replyRepoFactory    func() port.ScoutReplyRepository
	settingsRepoFactory func() port.UserScoutSettingsRepository
	notifRepoFactory    func() port.NotificationRepository
	userRepoFactory     func() port.UserRepository
	tx                  port.TxManager
}

// NewCandidateScoutController creates a CandidateScoutController.
func NewCandidateScoutController(
	inputFactory func(
		msgRepo port.ScoutMessageRepository,
		creditRepo port.ScoutCreditRepository,
		ledgerRepo port.ScoutCreditLedgerRepository,
		replyRepo port.ScoutReplyRepository,
		settingsRepo port.UserScoutSettingsRepository,
		notifRepo port.NotificationRepository,
		userRepo port.UserRepository,
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
	tx port.TxManager,
) *CandidateScoutController {
	return &CandidateScoutController{
		inputFactory:        inputFactory,
		outputFactory:       outputFactory,
		msgRepoFactory:      msgRepoFactory,
		creditRepoFactory:   creditRepoFactory,
		ledgerRepoFactory:   ledgerRepoFactory,
		replyRepoFactory:    replyRepoFactory,
		settingsRepoFactory: settingsRepoFactory,
		notifRepoFactory:    notifRepoFactory,
		userRepoFactory:     userRepoFactory,
		tx:                  tx,
	}
}

type respondRequest struct {
	Response string `json:"response"`
}

type candidateReplyRequest struct {
	Body string `json:"body"`
}

type bulkDeclineRequest struct {
	ScoutIDs []string `json:"scoutIds"`
}

// List handles GET /api/scouts.
func (c *CandidateScoutController) List(ctx echo.Context) error {
	userID, ok := ctx.Get(authmw.UserIDKey).(string)
	if !ok || userID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	limit, _ := strconv.Atoi(ctx.QueryParam("limit"))
	offset, _ := strconv.Atoi(ctx.QueryParam("offset"))

	input, p := c.newIO()
	if err := input.ListByCandidate(ctx.Request().Context(), userID, limit, offset); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.ListResponse())
}

// GetDetail handles GET /api/scouts/:scoutID.
func (c *CandidateScoutController) GetDetail(ctx echo.Context, scoutID string) error {
	userID, ok := ctx.Get(authmw.UserIDKey).(string)
	if !ok || userID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	input, p := c.newIO()
	if err := input.GetReceivedDetail(ctx.Request().Context(), userID, scoutID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.DetailResponse())
}

// Respond handles POST /api/scouts/:scoutID/respond.
func (c *CandidateScoutController) Respond(ctx echo.Context, scoutID string) error {
	userID, ok := ctx.Get(authmw.UserIDKey).(string)
	if !ok || userID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	var body respondRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request body")
	}

	input, p := c.newIO()
	if err := input.Respond(ctx.Request().Context(), userID, scoutID, scout.CandidateResponse(body.Response)); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.MessageResponse())
}

// Reply handles POST /api/scouts/:scoutID/replies.
func (c *CandidateScoutController) Reply(ctx echo.Context, scoutID string) error {
	userID, ok := ctx.Get(authmw.UserIDKey).(string)
	if !ok || userID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	var body candidateReplyRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request body")
	}

	input, p := c.newIO()
	if err := input.CandidateReply(ctx.Request().Context(), userID, scoutID, body.Body); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, p.DetailResponse())
}

// BulkDecline handles POST /api/scouts/bulk-decline.
func (c *CandidateScoutController) BulkDecline(ctx echo.Context) error {
	userID, ok := ctx.Get(authmw.UserIDKey).(string)
	if !ok || userID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	var body bulkDeclineRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request body")
	}

	input, _ := c.newIO()
	if err := input.BulkDecline(ctx.Request().Context(), userID, body.ScoutIDs); err != nil {
		return handleError(ctx, err)
	}
	return ctx.NoContent(http.StatusNoContent)
}

func (c *CandidateScoutController) newIO() (port.ScoutInputPort, *presenter.ScoutPresenter) {
	output := c.outputFactory()
	input := c.inputFactory(
		c.msgRepoFactory(),
		c.creditRepoFactory(),
		c.ledgerRepoFactory(),
		c.replyRepoFactory(),
		c.settingsRepoFactory(),
		c.notifRepoFactory(),
		c.userRepoFactory(),
		c.tx,
		output,
	)
	return input, output
}
