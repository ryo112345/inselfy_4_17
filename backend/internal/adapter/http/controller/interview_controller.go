package controller

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"

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

// Propose handles POST /api/company/interviews/propose.
func (ctrl *InterviewController) Propose(ctx context.Context, req openapi.CompanyInterviewsProposeInterviewRequestObject) (openapi.CompanyInterviewsProposeInterviewResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)
	if req.Body == nil {
		return openapi.CompanyInterviewsProposeInterview400JSONResponse(badRequestBody("invalid request")), nil
	}

	if len(req.Body.Slots) == 0 {
		return openapi.CompanyInterviewsProposeInterview400JSONResponse(badRequestBody("at least one slot is required")), nil
	}
	if len(req.Body.Slots) > 10 {
		return openapi.CompanyInterviewsProposeInterview400JSONResponse(badRequestBody("maximum 10 slots")), nil
	}

	slots := make([]interview.SlotInput, len(req.Body.Slots))
	for i, s := range req.Body.Slots {
		start, err := time.Parse(time.RFC3339, s.StartTime)
		if err != nil { //nolint:nilerr // 従来どおり固定メッセージの 400 を返す
			return openapi.CompanyInterviewsProposeInterview400JSONResponse(badRequestBody("invalid start time")), nil
		}
		end, err := time.Parse(time.RFC3339, s.EndTime)
		if err != nil { //nolint:nilerr // 従来どおり固定メッセージの 400 を返す
			return openapi.CompanyInterviewsProposeInterview400JSONResponse(badRequestBody("invalid end time")), nil
		}
		if !end.After(start) {
			return openapi.CompanyInterviewsProposeInterview400JSONResponse(badRequestBody("end time must be after start time")), nil
		}
		slots[i] = interview.SlotInput{StartTime: start, EndTime: end}
	}

	out, err := ctrl.input.Propose(ctx, interview.ProposeInput{
		ApplicationID:   req.Body.ApplicationId,
		CompanyID:       companyID,
		Message:         req.Body.Message,
		Location:        req.Body.Location,
		DurationMinutes: req.Body.DurationMinutes,
		Slots:           slots,
		ExpiresInDays:   req.Body.ExpiresInDays,
	})
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.CompanyInterviewsProposeInterview404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CompanyInterviewsProposeInterview400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
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
			ctrl.ws.Send("candidate:"+out.Proposal.CandidateID, payload)
		}
	}

	return openapi.CompanyInterviewsProposeInterview201JSONResponse(*presenter.ProposeInterviewResponse(out.Proposal.ID, out.Slots)), nil
}

// SelectSlot handles POST /api/interviews/proposals/{proposalId}/select.
func (ctrl *InterviewController) SelectSlot(ctx context.Context, req openapi.CandidateInterviewsSelectInterviewSlotRequestObject) (openapi.CandidateInterviewsSelectInterviewSlotResponseObject, error) {
	userID := authmw.UserIDFromContext(ctx)
	if req.Body == nil {
		return openapi.CandidateInterviewsSelectInterviewSlot400JSONResponse(badRequestBody("invalid request")), nil
	}

	input := interview.SelectSlotInput{
		ProposalID:  req.ProposalId,
		SlotID:      req.Body.SlotId,
		CandidateID: userID,
	}
	if req.Body.StartTime != "" && req.Body.EndTime != "" {
		st, err := time.Parse(time.RFC3339, req.Body.StartTime)
		if err != nil { //nolint:nilerr // 従来どおり固定メッセージの 400 を返す
			return openapi.CandidateInterviewsSelectInterviewSlot400JSONResponse(badRequestBody("invalid startTime")), nil
		}
		et, err := time.Parse(time.RFC3339, req.Body.EndTime)
		if err != nil { //nolint:nilerr // 従来どおり固定メッセージの 400 を返す
			return openapi.CandidateInterviewsSelectInterviewSlot400JSONResponse(badRequestBody("invalid endTime")), nil
		}
		input.StartTime = &st
		input.EndTime = &et
	}

	iv, err := ctrl.input.SelectSlot(ctx, input)
	if err != nil {
		switch errorStatus(err) {
		case http.StatusForbidden:
			return openapi.CandidateInterviewsSelectInterviewSlot403JSONResponse(forbiddenBody(err)), nil
		case http.StatusNotFound:
			return openapi.CandidateInterviewsSelectInterviewSlot404JSONResponse(notFoundBody(err)), nil
		case http.StatusConflict:
			return openapi.CandidateInterviewsSelectInterviewSlot409JSONResponse(conflictBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CandidateInterviewsSelectInterviewSlot400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}

	return openapi.CandidateInterviewsSelectInterviewSlot200JSONResponse(*presenter.SelectSlotResponse(iv)), nil
}

// ListByCompany handles GET /api/company/interviews.
// from/to の不正・欠落はデフォルト窓（今日〜+7日）へ丸める（echo 時代から同じ）。
func (ctrl *InterviewController) ListByCompany(ctx context.Context, req openapi.CompanyInterviewsListCompanyInterviewsRequestObject) (openapi.CompanyInterviewsListCompanyInterviewsResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)

	from, err := time.Parse("2006-01-02", derefString(req.Params.From))
	if err != nil {
		from = time.Now().Truncate(24 * time.Hour)
	}
	to, err := time.Parse("2006-01-02", derefString(req.Params.To))
	if err != nil {
		to = from.Add(7 * 24 * time.Hour)
	}

	interviews, err := ctrl.input.ListByCompany(ctx, companyID, from, to)
	if err != nil {
		return nil, err
	}

	return openapi.CompanyInterviewsListCompanyInterviews200JSONResponse(*presenter.CompanyInterviewsResponse(interviews)), nil
}

// ListByCandidate handles GET /api/interviews.
func (ctrl *InterviewController) ListByCandidate(ctx context.Context, _ openapi.CandidateInterviewsListCandidateInterviewsRequestObject) (openapi.CandidateInterviewsListCandidateInterviewsResponseObject, error) {
	userID := authmw.UserIDFromContext(ctx)

	interviews, proposals, err := ctrl.input.ListByCandidate(ctx, userID)
	if err != nil {
		return nil, err
	}

	return openapi.CandidateInterviewsListCandidateInterviews200JSONResponse(*presenter.CandidateInterviewsResponse(interviews, proposals)), nil
}

// cancelInterview is the shared body of the company/candidate cancel handlers.
// Returns (status, err); status 0 means success.
func (ctrl *InterviewController) cancelInterview(ctx context.Context, interviewID, companyID, userID string) (int, error) {
	err := ctrl.input.CancelInterview(ctx, interviewID, companyID, userID)
	if err == nil {
		return 0, nil
	}
	if errors.Is(err, interview.ErrCancelUnauthorized) {
		return http.StatusUnauthorized, err
	}
	return errorStatus(err), err
}

// CancelAsCompany handles POST /api/company/interviews/{interviewId}/cancel.
func (ctrl *InterviewController) CancelAsCompany(ctx context.Context, req openapi.CompanyInterviewsCancelCompanyInterviewRequestObject) (openapi.CompanyInterviewsCancelCompanyInterviewResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)

	status, err := ctrl.cancelInterview(ctx, req.InterviewId, companyID, "")
	switch status {
	case 0:
		return openapi.CompanyInterviewsCancelCompanyInterview200JSONResponse(openapi.ModelsStatusOkResponse{Status: "cancelled"}), nil
	case http.StatusUnauthorized:
		return openapi.CompanyInterviewsCancelCompanyInterview401JSONResponse(unauthorizedBody("unauthorized")), nil
	case http.StatusForbidden:
		return openapi.CompanyInterviewsCancelCompanyInterview403JSONResponse(forbiddenBody(err)), nil
	case http.StatusNotFound:
		return openapi.CompanyInterviewsCancelCompanyInterview404JSONResponse(notFoundBody(err)), nil
	case http.StatusBadRequest:
		return openapi.CompanyInterviewsCancelCompanyInterview400JSONResponse(badRequestBody(err.Error())), nil
	}
	return nil, err
}

// CancelAsCandidate handles POST /api/interviews/{interviewId}/cancel.
func (ctrl *InterviewController) CancelAsCandidate(ctx context.Context, req openapi.CandidateInterviewsCancelCandidateInterviewRequestObject) (openapi.CandidateInterviewsCancelCandidateInterviewResponseObject, error) {
	userID := authmw.UserIDFromContext(ctx)

	status, err := ctrl.cancelInterview(ctx, req.InterviewId, "", userID)
	switch status {
	case 0:
		return openapi.CandidateInterviewsCancelCandidateInterview200JSONResponse(openapi.ModelsStatusOkResponse{Status: "cancelled"}), nil
	case http.StatusUnauthorized:
		return openapi.CandidateInterviewsCancelCandidateInterview401JSONResponse(unauthorizedBody("unauthorized")), nil
	case http.StatusForbidden:
		return openapi.CandidateInterviewsCancelCandidateInterview403JSONResponse(forbiddenBody(err)), nil
	case http.StatusNotFound:
		return openapi.CandidateInterviewsCancelCandidateInterview404JSONResponse(notFoundBody(err)), nil
	case http.StatusBadRequest:
		return openapi.CandidateInterviewsCancelCandidateInterview400JSONResponse(badRequestBody(err.Error())), nil
	}
	return nil, err
}

// GetPendingProposal handles GET /api/company/interviews/pending/{applicationId}.
// エラーは種別を問わず hasPending: false の 200 に丸める（echo 時代から同じ）。
func (ctrl *InterviewController) GetPendingProposal(ctx context.Context, req openapi.CompanyInterviewsGetPendingProposalRequestObject) (openapi.CompanyInterviewsGetPendingProposalResponseObject, error) {
	pending, err := ctrl.input.GetPendingProposal(ctx, req.ApplicationId)
	if err != nil { //nolint:nilerr // pending なし＝エラーの実装のため、従来どおり 200 hasPending:false に丸める
		return openapi.CompanyInterviewsGetPendingProposal200JSONResponse(openapi.ModelsPendingProposalCheckResponse{HasPending: false}), nil
	}

	return openapi.CompanyInterviewsGetPendingProposal200JSONResponse(openapi.ModelsPendingProposalCheckResponse{
		HasPending: true,
		ProposalId: &pending.ProposalID,
		CreatedAt:  &pending.CreatedAt,
	}), nil
}

// GetProposalSlots handles GET /api/interviews/proposals/{proposalId}/slots.
func (ctrl *InterviewController) GetProposalSlots(ctx context.Context, req openapi.CandidateInterviewsGetProposalSlotsRequestObject) (openapi.CandidateInterviewsGetProposalSlotsResponseObject, error) {
	proposal, slots, err := ctrl.input.GetProposalSlots(ctx, req.ProposalId)
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.CandidateInterviewsGetProposalSlots404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CandidateInterviewsGetProposalSlots400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}

	return openapi.CandidateInterviewsGetProposalSlots200JSONResponse(*presenter.ProposalSlotsResponse(proposal, slots)), nil
}
