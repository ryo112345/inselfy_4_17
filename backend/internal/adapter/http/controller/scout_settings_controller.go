package controller

import (
	"net/http"

	"github.com/labstack/echo/v4"

	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// ScoutSettingsController handles user scout settings HTTP endpoints.
type ScoutSettingsController struct {
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

// NewScoutSettingsController creates a ScoutSettingsController.
func NewScoutSettingsController(
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
) *ScoutSettingsController {
	return &ScoutSettingsController{
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

type updateScoutSettingsRequest struct {
	AcceptingScouts bool `json:"acceptingScouts"`
}

// Get handles GET /api/scout-settings.
func (c *ScoutSettingsController) Get(ctx echo.Context) error {
	userID := authmw.UserID(ctx)

	input, p := c.newIO()
	if err := input.GetScoutSettings(ctx.Request().Context(), userID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.SettingsResponse())
}

// Update handles PUT /api/scout-settings.
func (c *ScoutSettingsController) Update(ctx echo.Context) error {
	userID := authmw.UserID(ctx)

	var body updateScoutSettingsRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request body")
	}

	input, p := c.newIO()
	if err := input.UpdateScoutSettings(ctx.Request().Context(), userID, body.AcceptingScouts); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.SettingsResponse())
}

func (c *ScoutSettingsController) newIO() (port.ScoutInputPort, *presenter.ScoutPresenter) {
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
