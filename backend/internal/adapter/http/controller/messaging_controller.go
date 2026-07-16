package controller

import (
	"context"
	"net/http"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
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

// messagingPagination replicates the echo-era parsePagination: absent or
// out-of-range values fall back to the defaults (limit 50 within 1-100,
// offset 0) instead of erroring.
func messagingPagination(limit, offset *int32) (int, int) {
	l, o := 50, 0
	if limit != nil && *limit > 0 && *limit <= 100 {
		l = int(*limit)
	}
	if offset != nil && *offset >= 0 {
		o = int(*offset)
	}
	return l, o
}

// StartConversation handles POST /api/company/messages/conversations.
func (c *MessagingController) StartConversation(ctx context.Context, req openapi.CompanyMessagingStartCompanyConversationRequestObject) (openapi.CompanyMessagingStartCompanyConversationResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)
	if req.Body == nil {
		return openapi.CompanyMessagingStartCompanyConversation400JSONResponse(badRequestBody("invalid request body")), nil
	}

	conv, err := c.input.StartConversation(ctx, messaging.StartConversationInput{
		CompanyID:   companyID,
		CandidateID: req.Body.CandidateId,
		SenderType:  "company",
		SenderID:    companyID,
		Body:        req.Body.Body,
	})
	if err != nil {
		switch errorStatus(err) {
		case http.StatusConflict:
			return openapi.CompanyMessagingStartCompanyConversation409JSONResponse(conflictBody(err)), nil
		case http.StatusNotFound:
			return openapi.CompanyMessagingStartCompanyConversation404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CompanyMessagingStartCompanyConversation400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CompanyMessagingStartCompanyConversation201JSONResponse(*presenter.MessagingConversationResponse(conv)), nil
}

// ListConversationsByCompany handles GET /api/company/messages/conversations.
func (c *MessagingController) ListConversationsByCompany(ctx context.Context, req openapi.CompanyMessagingListCompanyConversationsRequestObject) (openapi.CompanyMessagingListCompanyConversationsResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)

	limit, offset := messagingPagination(req.Params.Limit, req.Params.Offset)
	convs, total, err := c.input.ListConversationsByCompany(ctx, companyID, limit, offset)
	if err != nil {
		if errorStatus(err) == http.StatusBadRequest {
			return openapi.CompanyMessagingListCompanyConversations400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CompanyMessagingListCompanyConversations200JSONResponse(*presenter.MessagingConversationsResponse(convs, total)), nil
}

// GetConversationAsCompany handles GET /api/company/messages/conversations/{conversationId}.
func (c *MessagingController) GetConversationAsCompany(ctx context.Context, req openapi.CompanyMessagingGetCompanyConversationRequestObject) (openapi.CompanyMessagingGetCompanyConversationResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)

	conv, err := c.input.GetConversation(ctx, req.ConversationId, "company", companyID)
	if err != nil {
		switch errorStatus(err) {
		case http.StatusForbidden:
			return openapi.CompanyMessagingGetCompanyConversation403JSONResponse(forbiddenBody(err)), nil
		case http.StatusNotFound:
			return openapi.CompanyMessagingGetCompanyConversation404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CompanyMessagingGetCompanyConversation400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CompanyMessagingGetCompanyConversation200JSONResponse(*presenter.MessagingConversationResponse(conv)), nil
}

// ListMessagesAsCompany handles GET /api/company/messages/conversations/{conversationId}/messages.
func (c *MessagingController) ListMessagesAsCompany(ctx context.Context, req openapi.CompanyMessagingListCompanyMessagesRequestObject) (openapi.CompanyMessagingListCompanyMessagesResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)

	limit, offset := messagingPagination(req.Params.Limit, req.Params.Offset)
	msgs, total, err := c.input.ListMessages(ctx, req.ConversationId, "company", companyID, limit, offset)
	if err != nil {
		switch errorStatus(err) {
		case http.StatusForbidden:
			return openapi.CompanyMessagingListCompanyMessages403JSONResponse(forbiddenBody(err)), nil
		case http.StatusNotFound:
			return openapi.CompanyMessagingListCompanyMessages404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CompanyMessagingListCompanyMessages400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CompanyMessagingListCompanyMessages200JSONResponse(*presenter.MessagingMessagesResponse(msgs, total)), nil
}

// SendMessageAsCompany handles POST /api/company/messages/conversations/{conversationId}/messages.
func (c *MessagingController) SendMessageAsCompany(ctx context.Context, req openapi.CompanyMessagingSendCompanyMessageRequestObject) (openapi.CompanyMessagingSendCompanyMessageResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)
	if req.Body == nil {
		return openapi.CompanyMessagingSendCompanyMessage400JSONResponse(badRequestBody("invalid request body")), nil
	}

	msg, err := c.input.SendMessage(ctx, messaging.SendMessageInput{
		ConversationID: req.ConversationId,
		SenderType:     "company",
		SenderID:       companyID,
		Body:           req.Body.Body,
	})
	if err != nil {
		switch errorStatus(err) {
		case http.StatusForbidden:
			return openapi.CompanyMessagingSendCompanyMessage403JSONResponse(forbiddenBody(err)), nil
		case http.StatusNotFound:
			return openapi.CompanyMessagingSendCompanyMessage404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CompanyMessagingSendCompanyMessage400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CompanyMessagingSendCompanyMessage201JSONResponse(*presenter.MessagingMessageResponse(msg)), nil
}

// MarkReadAsCompany handles POST /api/company/messages/conversations/{conversationId}/read.
func (c *MessagingController) MarkReadAsCompany(ctx context.Context, req openapi.CompanyMessagingMarkCompanyConversationReadRequestObject) (openapi.CompanyMessagingMarkCompanyConversationReadResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)

	if err := c.input.MarkRead(ctx, req.ConversationId, "company", companyID); err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.CompanyMessagingMarkCompanyConversationRead404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CompanyMessagingMarkCompanyConversationRead400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CompanyMessagingMarkCompanyConversationRead200JSONResponse(*presenter.MessagingOKResponse()), nil
}

// CountUnreadByCompany handles GET /api/company/messages/unread-count.
func (c *MessagingController) CountUnreadByCompany(ctx context.Context, _ openapi.CompanyMessagingCountCompanyUnreadMessagesRequestObject) (openapi.CompanyMessagingCountCompanyUnreadMessagesResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)

	count, err := c.input.CountUnreadByCompany(ctx, companyID)
	if err != nil {
		if errorStatus(err) == http.StatusBadRequest {
			return openapi.CompanyMessagingCountCompanyUnreadMessages400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CompanyMessagingCountCompanyUnreadMessages200JSONResponse(*presenter.MessagingUnreadCountResponse(count)), nil
}

// StartCandidateConversation handles POST /api/messages/conversations.
func (c *MessagingController) StartCandidateConversation(ctx context.Context, req openapi.CandidateMessagingStartCandidateConversationRequestObject) (openapi.CandidateMessagingStartCandidateConversationResponseObject, error) {
	userID := authmw.UserIDFromContext(ctx)
	if req.Body == nil {
		return openapi.CandidateMessagingStartCandidateConversation400JSONResponse(badRequestBody("invalid request body")), nil
	}

	conv, err := c.input.StartCandidateConversation(ctx, messaging.StartCandidateConversationInput{
		SenderID:    userID,
		RecipientID: req.Body.RecipientId,
		Body:        req.Body.Body,
	})
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.CandidateMessagingStartCandidateConversation404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CandidateMessagingStartCandidateConversation400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CandidateMessagingStartCandidateConversation201JSONResponse(*presenter.MessagingConversationResponse(conv)), nil
}

// ListConversationsByCandidate handles GET /api/messages/conversations.
func (c *MessagingController) ListConversationsByCandidate(ctx context.Context, req openapi.CandidateMessagingListCandidateConversationsRequestObject) (openapi.CandidateMessagingListCandidateConversationsResponseObject, error) {
	userID := authmw.UserIDFromContext(ctx)

	limit, offset := messagingPagination(req.Params.Limit, req.Params.Offset)
	convs, total, err := c.input.ListConversationsByCandidate(ctx, userID, limit, offset)
	if err != nil {
		if errorStatus(err) == http.StatusBadRequest {
			return openapi.CandidateMessagingListCandidateConversations400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CandidateMessagingListCandidateConversations200JSONResponse(*presenter.MessagingConversationsResponse(convs, total)), nil
}

// GetConversationAsCandidate handles GET /api/messages/conversations/{conversationId}.
func (c *MessagingController) GetConversationAsCandidate(ctx context.Context, req openapi.CandidateMessagingGetCandidateConversationRequestObject) (openapi.CandidateMessagingGetCandidateConversationResponseObject, error) {
	userID := authmw.UserIDFromContext(ctx)

	conv, err := c.input.GetConversation(ctx, req.ConversationId, "candidate", userID)
	if err != nil {
		switch errorStatus(err) {
		case http.StatusForbidden:
			return openapi.CandidateMessagingGetCandidateConversation403JSONResponse(forbiddenBody(err)), nil
		case http.StatusNotFound:
			return openapi.CandidateMessagingGetCandidateConversation404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CandidateMessagingGetCandidateConversation400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CandidateMessagingGetCandidateConversation200JSONResponse(*presenter.MessagingConversationResponse(conv)), nil
}

// ListMessagesAsCandidate handles GET /api/messages/conversations/{conversationId}/messages.
func (c *MessagingController) ListMessagesAsCandidate(ctx context.Context, req openapi.CandidateMessagingListCandidateMessagesRequestObject) (openapi.CandidateMessagingListCandidateMessagesResponseObject, error) {
	userID := authmw.UserIDFromContext(ctx)

	limit, offset := messagingPagination(req.Params.Limit, req.Params.Offset)
	msgs, total, err := c.input.ListMessages(ctx, req.ConversationId, "candidate", userID, limit, offset)
	if err != nil {
		switch errorStatus(err) {
		case http.StatusForbidden:
			return openapi.CandidateMessagingListCandidateMessages403JSONResponse(forbiddenBody(err)), nil
		case http.StatusNotFound:
			return openapi.CandidateMessagingListCandidateMessages404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CandidateMessagingListCandidateMessages400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CandidateMessagingListCandidateMessages200JSONResponse(*presenter.MessagingMessagesResponse(msgs, total)), nil
}

// SendMessageAsCandidate handles POST /api/messages/conversations/{conversationId}/messages.
func (c *MessagingController) SendMessageAsCandidate(ctx context.Context, req openapi.CandidateMessagingSendCandidateMessageRequestObject) (openapi.CandidateMessagingSendCandidateMessageResponseObject, error) {
	userID := authmw.UserIDFromContext(ctx)
	if req.Body == nil {
		return openapi.CandidateMessagingSendCandidateMessage400JSONResponse(badRequestBody("invalid request body")), nil
	}

	msg, err := c.input.SendMessage(ctx, messaging.SendMessageInput{
		ConversationID: req.ConversationId,
		SenderType:     "candidate",
		SenderID:       userID,
		Body:           req.Body.Body,
	})
	if err != nil {
		switch errorStatus(err) {
		case http.StatusForbidden:
			return openapi.CandidateMessagingSendCandidateMessage403JSONResponse(forbiddenBody(err)), nil
		case http.StatusNotFound:
			return openapi.CandidateMessagingSendCandidateMessage404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CandidateMessagingSendCandidateMessage400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CandidateMessagingSendCandidateMessage201JSONResponse(*presenter.MessagingMessageResponse(msg)), nil
}

// MarkReadAsCandidate handles POST /api/messages/conversations/{conversationId}/read.
func (c *MessagingController) MarkReadAsCandidate(ctx context.Context, req openapi.CandidateMessagingMarkCandidateConversationReadRequestObject) (openapi.CandidateMessagingMarkCandidateConversationReadResponseObject, error) {
	userID := authmw.UserIDFromContext(ctx)

	if err := c.input.MarkRead(ctx, req.ConversationId, "candidate", userID); err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.CandidateMessagingMarkCandidateConversationRead404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CandidateMessagingMarkCandidateConversationRead400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CandidateMessagingMarkCandidateConversationRead200JSONResponse(*presenter.MessagingOKResponse()), nil
}

// CountUnreadByCandidate handles GET /api/messages/unread-count.
func (c *MessagingController) CountUnreadByCandidate(ctx context.Context, _ openapi.CandidateMessagingCountCandidateUnreadMessagesRequestObject) (openapi.CandidateMessagingCountCandidateUnreadMessagesResponseObject, error) {
	userID := authmw.UserIDFromContext(ctx)

	count, err := c.input.CountUnreadByCandidate(ctx, userID)
	if err != nil {
		if errorStatus(err) == http.StatusBadRequest {
			return openapi.CandidateMessagingCountCandidateUnreadMessages400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CandidateMessagingCountCandidateUnreadMessages200JSONResponse(*presenter.MessagingUnreadCountResponse(count)), nil
}
