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
		convRepo port.ConversationRepository,
		convMsgRepo port.MessageRepository,
		participantRepo port.ConversationParticipantRepository,
		tx port.TxManager,
	) port.ScoutInputPort
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
		convRepo port.ConversationRepository,
		convMsgRepo port.MessageRepository,
		participantRepo port.ConversationParticipantRepository,
		tx port.TxManager,
	) port.ScoutInputPort,
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
) *CandidateScoutController {
	return &CandidateScoutController{
		inputFactory:           inputFactory,
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

type respondRequest struct {
	Response string `json:"response"`
}

type candidateReplyRequest struct {
	Body string `json:"body"`
}

type bulkDeclineRequest struct {
	ScoutIDs []string `json:"scoutIds"`
}

type bulkRespondRequest struct {
	ScoutIDs []string `json:"scoutIds"`
	Response string   `json:"response"`
}

// List handles GET /api/scouts.
func (c *CandidateScoutController) List(ctx echo.Context) error {
	userID := authmw.UserID(ctx)

	limit, _ := strconv.Atoi(ctx.QueryParam("limit"))
	offset, _ := strconv.Atoi(ctx.QueryParam("offset"))

	msgs, total, err := c.newInput().ListByCandidate(ctx.Request().Context(), userID, limit, offset)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.ScoutMessagesResponse(msgs, total))
}

// GetDetail handles GET /api/scouts/:scoutID.
func (c *CandidateScoutController) GetDetail(ctx echo.Context, scoutID string) error {
	userID := authmw.UserID(ctx)

	msg, replies, err := c.newInput().GetReceivedDetail(ctx.Request().Context(), userID, scoutID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.ScoutDetailResponse(msg, replies))
}

// Respond handles POST /api/scouts/:scoutID/respond.
func (c *CandidateScoutController) Respond(ctx echo.Context, scoutID string) error {
	userID := authmw.UserID(ctx)

	var body respondRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request body")
	}

	if err := c.newInput().Respond(ctx.Request().Context(), userID, scoutID, scout.CandidateResponse(body.Response)); err != nil {
		return handleError(ctx, err)
	}

	resp := map[string]string{"status": "ok"}
	msgRepo := c.msgRepoFactory()
	msg, err := msgRepo.GetByID(ctx.Request().Context(), scoutID)
	if err == nil {
		convRepo := c.convRepoFactory()
		conv, err := convRepo.GetByCompanyAndCandidate(ctx.Request().Context(), msg.CompanyID, msg.CandidateID)
		if err == nil && conv != nil {
			resp["conversationId"] = conv.ID
		}
	}
	return ctx.JSON(http.StatusOK, resp)
}

// Reply handles POST /api/scouts/:scoutID/replies.
func (c *CandidateScoutController) Reply(ctx echo.Context, scoutID string) error {
	userID := authmw.UserID(ctx)

	var body candidateReplyRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request body")
	}

	if err := c.newInput().CandidateReply(ctx.Request().Context(), userID, scoutID, body.Body); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, nil)
}

// BulkDecline handles POST /api/scouts/bulk-decline.
func (c *CandidateScoutController) BulkDecline(ctx echo.Context) error {
	userID := authmw.UserID(ctx)

	var body bulkDeclineRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request body")
	}

	if err := c.newInput().BulkDecline(ctx.Request().Context(), userID, body.ScoutIDs); err != nil {
		return handleError(ctx, err)
	}
	return ctx.NoContent(http.StatusNoContent)
}

// BulkRespond handles POST /api/scouts/bulk-respond.
func (c *CandidateScoutController) BulkRespond(ctx echo.Context) error {
	userID := authmw.UserID(ctx)

	var body bulkRespondRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request body")
	}

	response, err := scout.ValidateResponse(body.Response)
	if err != nil {
		return badRequest(ctx, "invalid response: must be 'interested' or 'declined'")
	}

	if err := c.newInput().BulkRespond(ctx.Request().Context(), userID, body.ScoutIDs, response); err != nil {
		return handleError(ctx, err)
	}
	return ctx.NoContent(http.StatusNoContent)
}

func (c *CandidateScoutController) newInput() port.ScoutInputPort {
	return c.inputFactory(
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
	)
}
