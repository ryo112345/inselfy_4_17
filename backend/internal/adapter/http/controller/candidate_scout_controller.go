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

	msgs, total, err := c.input.ListByCandidate(ctx.Request().Context(), userID, limit, offset)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.ScoutMessagesResponse(msgs, total))
}

// GetDetail handles GET /api/scouts/:scoutID.
func (c *CandidateScoutController) GetDetail(ctx echo.Context, scoutID string) error {
	userID := authmw.UserID(ctx)

	msg, replies, err := c.input.GetReceivedDetail(ctx.Request().Context(), userID, scoutID)
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

	if err := c.input.Respond(ctx.Request().Context(), userID, scoutID, scout.CandidateResponse(body.Response)); err != nil {
		return handleError(ctx, err)
	}

	resp := map[string]string{"status": "ok"}
	msg, err := c.msgRepo.GetByID(ctx.Request().Context(), scoutID)
	if err == nil {
		conv, err := c.convRepo.GetByCompanyAndCandidate(ctx.Request().Context(), msg.CompanyID, msg.CandidateID)
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

	if err := c.input.CandidateReply(ctx.Request().Context(), userID, scoutID, body.Body); err != nil {
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

	if err := c.input.BulkDecline(ctx.Request().Context(), userID, body.ScoutIDs); err != nil {
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

	if err := c.input.BulkRespond(ctx.Request().Context(), userID, body.ScoutIDs, response); err != nil {
		return handleError(ctx, err)
	}
	return ctx.NoContent(http.StatusNoContent)
}
