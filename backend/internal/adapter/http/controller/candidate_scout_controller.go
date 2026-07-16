package controller

import (
	"context"
	"net/http"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/domain/scout"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// CandidateScoutController handles candidate-side scout HTTP endpoints.
type CandidateScoutController struct {
	input port.ScoutInputPort
	// msgRepo/convRepo are read directly in Respond to resolve the
	// conversation created as a side effect of responding to a scout.
	msgRepo  port.ScoutMessageRepository
	convRepo port.ConversationRepository
}

// NewCandidateScoutController creates a CandidateScoutController.
func NewCandidateScoutController(
	input port.ScoutInputPort,
	msgRepo port.ScoutMessageRepository,
	convRepo port.ConversationRepository,
) *CandidateScoutController {
	return &CandidateScoutController{
		input:    input,
		msgRepo:  msgRepo,
		convRepo: convRepo,
	}
}

// List handles GET /api/scouts.
func (c *CandidateScoutController) List(ctx context.Context, req openapi.CandidateScoutsListCandidateScoutsRequestObject) (openapi.CandidateScoutsListCandidateScoutsResponseObject, error) {
	userID := authmw.UserIDFromContext(ctx)

	msgs, total, err := c.input.ListByCandidate(ctx, userID, derefInt32(req.Params.Limit), derefInt32(req.Params.Offset))
	if err != nil {
		if errorStatus(err) == http.StatusBadRequest {
			return openapi.CandidateScoutsListCandidateScouts400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CandidateScoutsListCandidateScouts200JSONResponse(*presenter.ScoutMessagesResponse(msgs, total)), nil
}

// CountUnread handles GET /api/scouts/unread-count.
func (c *CandidateScoutController) CountUnread(ctx context.Context, _ openapi.CandidateScoutsCountCandidateUnreadScoutsRequestObject) (openapi.CandidateScoutsCountCandidateUnreadScoutsResponseObject, error) {
	userID := authmw.UserIDFromContext(ctx)

	count, err := c.input.CountUnreadByCandidate(ctx, userID)
	if err != nil {
		if errorStatus(err) == http.StatusBadRequest {
			return openapi.CandidateScoutsCountCandidateUnreadScouts400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CandidateScoutsCountCandidateUnreadScouts200JSONResponse(*presenter.ScoutUnreadCountResponse(count)), nil
}

// GetDetail handles GET /api/scouts/{scoutId}.
func (c *CandidateScoutController) GetDetail(ctx context.Context, req openapi.CandidateScoutsGetCandidateScoutDetailRequestObject) (openapi.CandidateScoutsGetCandidateScoutDetailResponseObject, error) {
	userID := authmw.UserIDFromContext(ctx)

	msg, replies, err := c.input.GetReceivedDetail(ctx, userID, req.ScoutId)
	if err != nil {
		switch errorStatus(err) {
		case http.StatusForbidden:
			return openapi.CandidateScoutsGetCandidateScoutDetail403JSONResponse(forbiddenBody(err)), nil
		case http.StatusNotFound:
			return openapi.CandidateScoutsGetCandidateScoutDetail404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CandidateScoutsGetCandidateScoutDetail400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CandidateScoutsGetCandidateScoutDetail200JSONResponse(*presenter.ScoutDetailResponse(msg, replies)), nil
}

// Respond handles POST /api/scouts/{scoutId}/respond.
func (c *CandidateScoutController) Respond(ctx context.Context, req openapi.CandidateScoutsRespondToScoutRequestObject) (openapi.CandidateScoutsRespondToScoutResponseObject, error) {
	userID := authmw.UserIDFromContext(ctx)
	if req.Body == nil {
		return openapi.CandidateScoutsRespondToScout400JSONResponse(badRequestBody("invalid request body")), nil
	}

	if err := c.input.Respond(ctx, userID, req.ScoutId, scout.CandidateResponse(req.Body.Response)); err != nil {
		switch errorStatus(err) {
		case http.StatusForbidden:
			return openapi.CandidateScoutsRespondToScout403JSONResponse(forbiddenBody(err)), nil
		case http.StatusNotFound:
			return openapi.CandidateScoutsRespondToScout404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CandidateScoutsRespondToScout400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}

	resp := openapi.ModelsScoutRespondResponse{Status: "ok"}
	msg, err := c.msgRepo.GetByID(ctx, req.ScoutId)
	if err == nil {
		conv, err := c.convRepo.GetByCompanyAndCandidate(ctx, msg.CompanyID, msg.CandidateID)
		if err == nil && conv != nil {
			resp.ConversationId = &conv.ID
		}
	}
	return openapi.CandidateScoutsRespondToScout200JSONResponse(resp), nil
}

// Reply handles POST /api/scouts/{scoutId}/reply.
func (c *CandidateScoutController) Reply(ctx context.Context, req openapi.CandidateScoutsCandidateScoutReplyRequestObject) (openapi.CandidateScoutsCandidateScoutReplyResponseObject, error) {
	userID := authmw.UserIDFromContext(ctx)
	if req.Body == nil {
		return openapi.CandidateScoutsCandidateScoutReply400JSONResponse(badRequestBody("invalid request body")), nil
	}

	if err := c.input.CandidateReply(ctx, userID, req.ScoutId, req.Body.Body); err != nil {
		switch errorStatus(err) {
		case http.StatusForbidden:
			return openapi.CandidateScoutsCandidateScoutReply403JSONResponse(forbiddenBody(err)), nil
		case http.StatusNotFound:
			return openapi.CandidateScoutsCandidateScoutReply404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CandidateScoutsCandidateScoutReply400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CandidateScoutsCandidateScoutReply201Response{}, nil
}

// BulkDecline handles POST /api/scouts/bulk-decline.
func (c *CandidateScoutController) BulkDecline(ctx context.Context, req openapi.CandidateScoutsBulkDeclineScoutsRequestObject) (openapi.CandidateScoutsBulkDeclineScoutsResponseObject, error) {
	userID := authmw.UserIDFromContext(ctx)
	if req.Body == nil {
		return openapi.CandidateScoutsBulkDeclineScouts400JSONResponse(badRequestBody("invalid request body")), nil
	}

	if err := c.input.BulkDecline(ctx, userID, req.Body.ScoutIds); err != nil {
		switch errorStatus(err) {
		case http.StatusForbidden:
			return openapi.CandidateScoutsBulkDeclineScouts403JSONResponse(forbiddenBody(err)), nil
		case http.StatusNotFound:
			return openapi.CandidateScoutsBulkDeclineScouts404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CandidateScoutsBulkDeclineScouts400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CandidateScoutsBulkDeclineScouts204Response{}, nil
}

// BulkRespond handles POST /api/scouts/bulk-respond.
func (c *CandidateScoutController) BulkRespond(ctx context.Context, req openapi.CandidateScoutsBulkRespondScoutsRequestObject) (openapi.CandidateScoutsBulkRespondScoutsResponseObject, error) {
	userID := authmw.UserIDFromContext(ctx)
	if req.Body == nil {
		return openapi.CandidateScoutsBulkRespondScouts400JSONResponse(badRequestBody("invalid request body")), nil
	}

	response, err := scout.ValidateResponse(req.Body.Response)
	if err != nil { //nolint:nilerr // 従来どおり固定メッセージの 400 を返す（エラーは種別のみで内容を持たない）
		return openapi.CandidateScoutsBulkRespondScouts400JSONResponse(badRequestBody("invalid response: must be 'interested' or 'declined'")), nil
	}

	if err := c.input.BulkRespond(ctx, userID, req.Body.ScoutIds, response); err != nil {
		switch errorStatus(err) {
		case http.StatusForbidden:
			return openapi.CandidateScoutsBulkRespondScouts403JSONResponse(forbiddenBody(err)), nil
		case http.StatusNotFound:
			return openapi.CandidateScoutsBulkRespondScouts404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CandidateScoutsBulkRespondScouts400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CandidateScoutsBulkRespondScouts204Response{}, nil
}
