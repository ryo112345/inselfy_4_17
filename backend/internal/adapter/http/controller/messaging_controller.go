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
	input port.MessagingInputPort
}

func NewMessagingController(
	input port.MessagingInputPort,
) *MessagingController {
	return &MessagingController{input: input}
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

	conv, err := c.input.StartConversation(ctx.Request().Context(), messaging.StartConversationInput{
		CompanyID:   companyID,
		CandidateID: body.CandidateID,
		SenderType:  "company",
		SenderID:    companyID,
		Body:        body.Body,
	})
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, presenter.MessagingConversationResponse(conv))
}

func (c *MessagingController) ListConversationsByCompany(ctx echo.Context) error {
	companyID := authmw.CompanyID(ctx)

	limit, offset := parsePagination(ctx)
	convs, total, err := c.input.ListConversationsByCompany(ctx.Request().Context(), companyID, limit, offset)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.MessagingConversationsResponse(convs, total))
}

func (c *MessagingController) GetConversationAsCompany(ctx echo.Context, conversationID string) error {
	companyID := authmw.CompanyID(ctx)

	conv, err := c.input.GetConversation(ctx.Request().Context(), conversationID, "company", companyID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.MessagingConversationResponse(conv))
}

func (c *MessagingController) ListMessagesAsCompany(ctx echo.Context, conversationID string) error {
	companyID := authmw.CompanyID(ctx)

	limit, offset := parsePagination(ctx)
	msgs, total, err := c.input.ListMessages(ctx.Request().Context(), conversationID, "company", companyID, limit, offset)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.MessagingMessagesResponse(msgs, total))
}

func (c *MessagingController) SendMessageAsCompany(ctx echo.Context, conversationID string) error {
	companyID := authmw.CompanyID(ctx)

	var body sendMessageRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request body")
	}

	msg, err := c.input.SendMessage(ctx.Request().Context(), messaging.SendMessageInput{
		ConversationID: conversationID,
		SenderType:     "company",
		SenderID:       companyID,
		Body:           body.Body,
	})
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, presenter.MessagingMessageResponse(msg))
}

func (c *MessagingController) MarkReadAsCompany(ctx echo.Context, conversationID string) error {
	companyID := authmw.CompanyID(ctx)

	if err := c.input.MarkRead(ctx.Request().Context(), conversationID, "company", companyID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.MessagingOKResponse())
}

func (c *MessagingController) CountUnreadByCompany(ctx echo.Context) error {
	companyID := authmw.CompanyID(ctx)

	count, err := c.input.CountUnreadByCompany(ctx.Request().Context(), companyID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.MessagingUnreadCountResponse(count))
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

	conv, err := c.input.StartCandidateConversation(ctx.Request().Context(), messaging.StartCandidateConversationInput{
		SenderID:    userID,
		RecipientID: body.RecipientID,
		Body:        body.Body,
	})
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, presenter.MessagingConversationResponse(conv))
}

func (c *MessagingController) ListConversationsByCandidate(ctx echo.Context) error {
	userID := authmw.UserID(ctx)

	limit, offset := parsePagination(ctx)
	convs, total, err := c.input.ListConversationsByCandidate(ctx.Request().Context(), userID, limit, offset)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.MessagingConversationsResponse(convs, total))
}

func (c *MessagingController) GetConversationAsCandidate(ctx echo.Context, conversationID string) error {
	userID := authmw.UserID(ctx)

	conv, err := c.input.GetConversation(ctx.Request().Context(), conversationID, "candidate", userID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.MessagingConversationResponse(conv))
}

func (c *MessagingController) ListMessagesAsCandidate(ctx echo.Context, conversationID string) error {
	userID := authmw.UserID(ctx)

	limit, offset := parsePagination(ctx)
	msgs, total, err := c.input.ListMessages(ctx.Request().Context(), conversationID, "candidate", userID, limit, offset)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.MessagingMessagesResponse(msgs, total))
}

func (c *MessagingController) SendMessageAsCandidate(ctx echo.Context, conversationID string) error {
	userID := authmw.UserID(ctx)

	var body sendMessageRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request body")
	}

	msg, err := c.input.SendMessage(ctx.Request().Context(), messaging.SendMessageInput{
		ConversationID: conversationID,
		SenderType:     "candidate",
		SenderID:       userID,
		Body:           body.Body,
	})
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, presenter.MessagingMessageResponse(msg))
}

func (c *MessagingController) MarkReadAsCandidate(ctx echo.Context, conversationID string) error {
	userID := authmw.UserID(ctx)

	if err := c.input.MarkRead(ctx.Request().Context(), conversationID, "candidate", userID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.MessagingOKResponse())
}

func (c *MessagingController) CountUnreadByCandidate(ctx echo.Context) error {
	userID := authmw.UserID(ctx)

	count, err := c.input.CountUnreadByCandidate(ctx.Request().Context(), userID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.MessagingUnreadCountResponse(count))
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
