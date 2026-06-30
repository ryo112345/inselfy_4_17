package controller

import (
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"

	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/domain/messaging"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type MessagingController struct {
	inputFactory func(
		convRepo port.ConversationRepository,
		msgRepo port.MessageRepository,
		participantRepo port.ConversationParticipantRepository,
		tx port.TxManager,
		output port.MessagingOutputPort,
	) port.MessagingInputPort
	outputFactory          func() *presenter.MessagingPresenter
	convRepoFactory        func() port.ConversationRepository
	msgRepoFactory         func() port.MessageRepository
	participantRepoFactory func() port.ConversationParticipantRepository
	tx                     port.TxManager
}

func NewMessagingController(
	inputFactory func(
		convRepo port.ConversationRepository,
		msgRepo port.MessageRepository,
		participantRepo port.ConversationParticipantRepository,
		tx port.TxManager,
		output port.MessagingOutputPort,
	) port.MessagingInputPort,
	outputFactory func() *presenter.MessagingPresenter,
	convRepoFactory func() port.ConversationRepository,
	msgRepoFactory func() port.MessageRepository,
	participantRepoFactory func() port.ConversationParticipantRepository,
	tx port.TxManager,
) *MessagingController {
	return &MessagingController{
		inputFactory:           inputFactory,
		outputFactory:          outputFactory,
		convRepoFactory:        convRepoFactory,
		msgRepoFactory:         msgRepoFactory,
		participantRepoFactory: participantRepoFactory,
		tx:                     tx,
	}
}

func (c *MessagingController) newIO() (port.MessagingInputPort, *presenter.MessagingPresenter) {
	output := c.outputFactory()
	input := c.inputFactory(
		c.convRepoFactory(),
		c.msgRepoFactory(),
		c.participantRepoFactory(),
		c.tx,
		output,
	)
	return input, output
}

type startConversationRequest struct {
	CandidateID string `json:"candidateId"`
	Body        string `json:"body"`
}

type sendMessageRequest struct {
	Body string `json:"body"`
}

func (c *MessagingController) StartConversation(ctx echo.Context) error {
	companyID := authmw.CompanyID(ctx)

	var body startConversationRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request body")
	}

	input, p := c.newIO()
	if err := input.StartConversation(ctx.Request().Context(), messaging.StartConversationInput{
		CompanyID:   companyID,
		CandidateID: body.CandidateID,
		SenderType:  "company",
		SenderID:    companyID,
		Body:        body.Body,
	}); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, p.ConversationResponse())
}

func (c *MessagingController) ListConversationsByCompany(ctx echo.Context) error {
	companyID := authmw.CompanyID(ctx)

	limit, offset := parsePagination(ctx)
	input, p := c.newIO()
	if err := input.ListConversationsByCompany(ctx.Request().Context(), companyID, limit, offset); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.ConversationListResponse())
}

func (c *MessagingController) GetConversationAsCompany(ctx echo.Context, conversationID string) error {
	companyID := authmw.CompanyID(ctx)

	input, p := c.newIO()
	if err := input.GetConversation(ctx.Request().Context(), conversationID, "company", companyID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.ConversationResponse())
}

func (c *MessagingController) ListMessagesAsCompany(ctx echo.Context, conversationID string) error {
	companyID := authmw.CompanyID(ctx)

	limit, offset := parsePagination(ctx)
	input, p := c.newIO()
	if err := input.ListMessages(ctx.Request().Context(), conversationID, "company", companyID, limit, offset); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.MessageListResponse())
}

func (c *MessagingController) SendMessageAsCompany(ctx echo.Context, conversationID string) error {
	companyID := authmw.CompanyID(ctx)

	var body sendMessageRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request body")
	}

	input, p := c.newIO()
	if err := input.SendMessage(ctx.Request().Context(), messaging.SendMessageInput{
		ConversationID: conversationID,
		SenderType:     "company",
		SenderID:       companyID,
		Body:           body.Body,
	}); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, p.MessageResponse())
}

func (c *MessagingController) MarkReadAsCompany(ctx echo.Context, conversationID string) error {
	companyID := authmw.CompanyID(ctx)

	input, p := c.newIO()
	if err := input.MarkRead(ctx.Request().Context(), conversationID, "company", companyID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.OKResponse())
}

func (c *MessagingController) CountUnreadByCompany(ctx echo.Context) error {
	companyID := authmw.CompanyID(ctx)

	input, p := c.newIO()
	if err := input.CountUnreadByCompany(ctx.Request().Context(), companyID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.UnreadCountResponse())
}

type startCandidateConversationRequest struct {
	RecipientID string `json:"recipientId"`
	Body        string `json:"body"`
}

func (c *MessagingController) StartCandidateConversation(ctx echo.Context) error {
	userID := authmw.UserID(ctx)

	var body startCandidateConversationRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request body")
	}

	input, p := c.newIO()
	if err := input.StartCandidateConversation(ctx.Request().Context(), messaging.StartCandidateConversationInput{
		SenderID:    userID,
		RecipientID: body.RecipientID,
		Body:        body.Body,
	}); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, p.ConversationResponse())
}

func (c *MessagingController) ListConversationsByCandidate(ctx echo.Context) error {
	userID := authmw.UserID(ctx)

	limit, offset := parsePagination(ctx)
	input, p := c.newIO()
	if err := input.ListConversationsByCandidate(ctx.Request().Context(), userID, limit, offset); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.ConversationListResponse())
}

func (c *MessagingController) GetConversationAsCandidate(ctx echo.Context, conversationID string) error {
	userID := authmw.UserID(ctx)

	input, p := c.newIO()
	if err := input.GetConversation(ctx.Request().Context(), conversationID, "candidate", userID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.ConversationResponse())
}

func (c *MessagingController) ListMessagesAsCandidate(ctx echo.Context, conversationID string) error {
	userID := authmw.UserID(ctx)

	limit, offset := parsePagination(ctx)
	input, p := c.newIO()
	if err := input.ListMessages(ctx.Request().Context(), conversationID, "candidate", userID, limit, offset); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.MessageListResponse())
}

func (c *MessagingController) SendMessageAsCandidate(ctx echo.Context, conversationID string) error {
	userID := authmw.UserID(ctx)

	var body sendMessageRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request body")
	}

	input, p := c.newIO()
	if err := input.SendMessage(ctx.Request().Context(), messaging.SendMessageInput{
		ConversationID: conversationID,
		SenderType:     "candidate",
		SenderID:       userID,
		Body:           body.Body,
	}); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, p.MessageResponse())
}

func (c *MessagingController) MarkReadAsCandidate(ctx echo.Context, conversationID string) error {
	userID := authmw.UserID(ctx)

	input, p := c.newIO()
	if err := input.MarkRead(ctx.Request().Context(), conversationID, "candidate", userID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.OKResponse())
}

func (c *MessagingController) CountUnreadByCandidate(ctx echo.Context) error {
	userID := authmw.UserID(ctx)

	input, p := c.newIO()
	if err := input.CountUnreadByCandidate(ctx.Request().Context(), userID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.UnreadCountResponse())
}

func parsePagination(ctx echo.Context) (int, int) {
	limit := 50
	offset := 0
	if l, err := strconv.Atoi(ctx.QueryParam("limit")); err == nil && l > 0 && l <= 100 {
		limit = l
	}
	if o, err := strconv.Atoi(ctx.QueryParam("offset")); err == nil && o >= 0 {
		offset = o
	}
	return limit, offset
}
