package controller

import (
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/labstack/echo/v4"

	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
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

type proposeRequest struct {
	ApplicationID   string `json:"applicationId"`
	Message         string `json:"message"`
	Location        string `json:"location"`
	DurationMinutes int    `json:"durationMinutes"`
	Slots           []struct {
		StartTime string `json:"startTime"`
		EndTime   string `json:"endTime"`
	} `json:"slots"`
	ExpiresInDays int `json:"expiresInDays"`
}

func (ctrl *InterviewController) Propose(c echo.Context) error {
	companyID := authmw.CompanyID(c)

	var req proposeRequest
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
		ApplicationID:   req.ApplicationID,
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

	return c.JSON(http.StatusCreated, map[string]interface{}{
		"proposalId": out.Proposal.ID,
		"slots":      slotsToResponse(out.Slots),
	})
}

type selectSlotRequest struct {
	SlotID    string `json:"slotId"`
	StartTime string `json:"startTime"`
	EndTime   string `json:"endTime"`
}

func (ctrl *InterviewController) SelectSlot(c echo.Context) error {
	userID := authmw.UserID(c)

	proposalID := c.Param("proposalId")
	var req selectSlotRequest
	if err := c.Bind(&req); err != nil {
		return badRequest(c, "invalid request")
	}

	input := interview.SelectSlotInput{
		ProposalID:  proposalID,
		SlotID:      req.SlotID,
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

	return c.JSON(http.StatusOK, map[string]interface{}{
		"interview": map[string]interface{}{
			"id":        iv.ID,
			"startTime": iv.StartTime,
			"endTime":   iv.EndTime,
			"status":    iv.Status,
		},
	})
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

	result := make([]map[string]interface{}, len(interviews))
	for i, iv := range interviews {
		item := interviewToResponse(&iv.Interview)
		item["candidateName"] = iv.CandidateName
		item["candidateAvatarUrl"] = iv.CandidateAvatar
		item["jobTitle"] = iv.JobTitle
		result[i] = item
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"interviews": result,
	})
}

func (ctrl *InterviewController) ListByCandidate(c echo.Context) error {
	userID := authmw.UserID(c)

	interviews, proposals, err := ctrl.input.ListByCandidate(c.Request().Context(), userID)
	if err != nil {
		return internalError(c, err.Error())
	}

	result := make([]map[string]interface{}, len(interviews))
	for i, iv := range interviews {
		item := interviewToResponse(&iv.Interview)
		item["companyName"] = iv.CompanyName
		item["jobTitle"] = iv.JobTitle
		result[i] = item
	}

	pendingProposals := make([]map[string]interface{}, 0, len(proposals))
	for _, p := range proposals {
		pendingProposals = append(pendingProposals, map[string]interface{}{
			"id":              p.ID,
			"companyName":     p.CompanyName,
			"jobTitle":        p.JobTitle,
			"message":         p.Message,
			"durationMinutes": p.DurationMinutes,
			"slots":           slotsToResponse(p.Slots),
			"expiresAt":       p.ExpiresAt,
			"createdAt":       p.CreatedAt,
		})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"interviews":       result,
		"pendingProposals": pendingProposals,
	})
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

	return c.JSON(http.StatusOK, map[string]string{"status": "cancelled"})
}

func (ctrl *InterviewController) GetPendingProposal(c echo.Context) error {
	// Auth is enforced by companyJwtMW; this handler does not scope by company.
	applicationID := c.Param("applicationId")

	pending, err := ctrl.input.GetPendingProposal(c.Request().Context(), applicationID)
	if err != nil {
		return c.JSON(http.StatusOK, map[string]interface{}{"hasPending": false})
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"hasPending": true,
		"proposalId": pending.ProposalID,
		"createdAt":  pending.CreatedAt,
	})
}

func (ctrl *InterviewController) GetProposalSlots(c echo.Context) error {
	proposalID := c.Param("proposalId")

	proposal, slots, err := ctrl.input.GetProposalSlots(c.Request().Context(), proposalID)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"proposal": map[string]interface{}{
			"id":        proposal.ID,
			"message":   proposal.Message,
			"status":    proposal.Status,
			"expiresAt": proposal.ExpiresAt,
		},
		"slots": slotsToResponse(slots),
	})
}

func slotsToResponse(slots []*interview.Slot) []map[string]interface{} {
	result := make([]map[string]interface{}, len(slots))
	for i, s := range slots {
		result[i] = map[string]interface{}{
			"id":        s.ID,
			"startTime": s.StartTime,
			"endTime":   s.EndTime,
			"status":    s.Status,
		}
	}
	return result
}

func interviewToResponse(iv *interview.Interview) map[string]interface{} {
	return map[string]interface{}{
		"id":            iv.ID,
		"applicationId": iv.ApplicationID,
		"startTime":     iv.StartTime,
		"endTime":       iv.EndTime,
		"location":      iv.Location,
		"meetingUrl":    iv.MeetingURL,
		"status":        iv.Status,
		"title":         iv.Title,
	}
}
