package controller

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/domain/interview"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type WSNotifier interface {
	Send(key string, data []byte)
}

type InterviewController struct {
	input port.InterviewInputPort
	ws    WSNotifier
}

func NewInterviewController(input port.InterviewInputPort) *InterviewController {
	return &InterviewController{input: input}
}

func (ctrl *InterviewController) SetWS(ws WSNotifier) {
	ctrl.ws = ws
}

func (ctrl *InterviewController) Propose(c echo.Context) error {
	companyID := authmw.CompanyID(c)

	var req openapi.ModelsProposeInterviewRequest
	if err := c.Bind(&req); err != nil {
		return badRequest(c, "invalid request")
	}

	if len(req.Slots) == 0 {
		return badRequest(c, "at least one slot is required")
	}
	if len(req.Slots) > 10 {
		return badRequest(c, "maximum 10 slots")
	}

	slots := make([]interview.SlotInput, len(req.Slots))
	for i, s := range req.Slots {
		start, err := time.Parse(time.RFC3339, s.StartTime)
		if err != nil {
			return badRequest(c, "invalid start time")
		}
		end, err := time.Parse(time.RFC3339, s.EndTime)
		if err != nil {
			return badRequest(c, "invalid end time")
		}
		if !end.After(start) {
			return badRequest(c, "end time must be after start time")
		}
		slots[i] = interview.SlotInput{StartTime: start, EndTime: end}
	}

	out, err := ctrl.input.Propose(c.Request().Context(), interview.ProposeInput{
		ApplicationID:   req.ApplicationId,
		CompanyID:       companyID,
		Message:         req.Message,
		Location:        req.Location,
		DurationMinutes: req.DurationMinutes,
		Slots:           slots,
		ExpiresInDays:   req.ExpiresInDays,
	})
	if err != nil {
		return handleError(c, err)
	}

	// Notify candidate via WebSocket about cancelled proposals
	if ctrl.ws != nil && len(out.CancelledProposalIDs) > 0 {
		for _, cpID := range out.CancelledProposalIDs {
			payload, _ := json.Marshal(map[string]interface{}{
				"type": "proposal_cancelled",
				"payload": map[string]string{
					"proposal_id": cpID,
				},
			})
			ctrl.ws.Send(fmt.Sprintf("candidate:%s", out.Proposal.CandidateID), payload)
		}
	}

	return c.JSON(http.StatusCreated, presenter.ProposeInterviewResponse(out.Proposal.ID, out.Slots))
}

func (ctrl *InterviewController) SelectSlot(c echo.Context) error {
	userID := authmw.UserID(c)

	proposalID := c.Param("proposalId")
	var req openapi.ModelsSelectSlotRequest
	if err := c.Bind(&req); err != nil {
		return badRequest(c, "invalid request")
	}

	input := interview.SelectSlotInput{
		ProposalID:  proposalID,
		SlotID:      req.SlotId,
		CandidateID: userID,
	}
	if req.StartTime != "" && req.EndTime != "" {
		st, err := time.Parse(time.RFC3339, req.StartTime)
		if err != nil {
			return badRequest(c, "invalid startTime")
		}
		et, err := time.Parse(time.RFC3339, req.EndTime)
		if err != nil {
			return badRequest(c, "invalid endTime")
		}
		input.StartTime = &st
		input.EndTime = &et
	}

	iv, err := ctrl.input.SelectSlot(c.Request().Context(), input)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(http.StatusOK, presenter.SelectSlotResponse(iv))
}

func (ctrl *InterviewController) ListByCompany(c echo.Context) error {
	companyID := authmw.CompanyID(c)

	fromStr := c.QueryParam("from")
	toStr := c.QueryParam("to")
	from, err := time.Parse("2006-01-02", fromStr)
	if err != nil {
		from = time.Now().Truncate(24 * time.Hour)
	}
	to, err := time.Parse("2006-01-02", toStr)
	if err != nil {
		to = from.Add(7 * 24 * time.Hour)
	}

	interviews, err := ctrl.input.ListByCompany(c.Request().Context(), companyID, from, to)
	if err != nil {
		return internalError(c, err.Error())
	}

	return c.JSON(http.StatusOK, presenter.CompanyInterviewsResponse(interviews))
}

func (ctrl *InterviewController) ListByCandidate(c echo.Context) error {
	userID := authmw.UserID(c)

	interviews, proposals, err := ctrl.input.ListByCandidate(c.Request().Context(), userID)
	if err != nil {
		return internalError(c, err.Error())
	}

	return c.JSON(http.StatusOK, presenter.CandidateInterviewsResponse(interviews, proposals))
}

func (ctrl *InterviewController) CancelInterview(c echo.Context) error {
	interviewID := c.Param("interviewId")

	companyID, _ := c.Get(authmw.CompanyIDKey).(string)
	userID, _ := c.Get(authmw.UserIDKey).(string)

	err := ctrl.input.CancelInterview(c.Request().Context(), interviewID, companyID, userID)
	if err != nil {
		if errors.Is(err, interview.ErrCancelUnauthorized) {
			return unauthorized(c, "unauthorized")
		}
		return handleError(c, err)
	}

	return c.JSON(http.StatusOK, openapi.ModelsStatusOkResponse{Status: "cancelled"})
}

func (ctrl *InterviewController) GetPendingProposal(c echo.Context) error {
	// Auth is enforced by companyJwtMW; this handler does not scope by company.
	applicationID := c.Param("applicationId")

	pending, err := ctrl.input.GetPendingProposal(c.Request().Context(), applicationID)
	if err != nil {
		return c.JSON(http.StatusOK, openapi.ModelsPendingProposalCheckResponse{HasPending: false})
	}

	return c.JSON(http.StatusOK, openapi.ModelsPendingProposalCheckResponse{
		HasPending: true,
		ProposalId: &pending.ProposalID,
		CreatedAt:  &pending.CreatedAt,
	})
}

func (ctrl *InterviewController) GetProposalSlots(c echo.Context) error {
	proposalID := c.Param("proposalId")

	proposal, slots, err := ctrl.input.GetProposalSlots(c.Request().Context(), proposalID)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(http.StatusOK, presenter.ProposalSlotsResponse(proposal, slots))
}

