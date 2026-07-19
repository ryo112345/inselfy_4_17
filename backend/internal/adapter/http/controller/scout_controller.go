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

// ScoutController handles company-side scout HTTP endpoints.
type ScoutController struct {
	input port.ScoutInputPort
}

// NewScoutController creates a ScoutController.
func NewScoutController(input port.ScoutInputPort) *ScoutController {
	return &ScoutController{input: input}
}

// Send handles POST /api/company/scouts.
func (c *ScoutController) Send(ctx context.Context, req openapi.CompanyScoutsSendScoutRequestObject) (openapi.CompanyScoutsSendScoutResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)
	if req.Body == nil {
		return openapi.CompanyScoutsSendScout400JSONResponse(badRequestBody("invalid request body")), nil
	}

	msg, err := c.input.Send(ctx, scout.SendScoutInput{
		CompanyID:    companyID,
		CandidateID:  req.Body.CandidateId,
		JobPostingID: req.Body.JobPostingId,
		TemplateID:   req.Body.TemplateId,
		Subject:      req.Body.Subject,
		Body:         req.Body.Body,
	})
	if err != nil {
		switch errorStatus(err) {
		case http.StatusForbidden:
			return openapi.CompanyScoutsSendScout403JSONResponse(forbiddenBody(err)), nil
		case http.StatusConflict:
			return openapi.CompanyScoutsSendScout409JSONResponse(conflictBody(err)), nil
		case http.StatusNotFound:
			return openapi.CompanyScoutsSendScout404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CompanyScoutsSendScout400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CompanyScoutsSendScout201JSONResponse(*presenter.ScoutMessageResponse(msg)), nil
}

// List handles GET /api/company/scouts.
func (c *ScoutController) List(ctx context.Context, req openapi.CompanyScoutsListCompanyScoutsRequestObject) (openapi.CompanyScoutsListCompanyScoutsResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)

	var status *string
	if req.Params.Status != nil && *req.Params.Status != "" {
		status = req.Params.Status
	}

	msgs, total, err := c.input.ListByCompany(ctx, companyID, status, derefInt32(req.Params.Limit), derefInt32(req.Params.Offset))
	if err != nil {
		if errorStatus(err) == http.StatusBadRequest {
			return openapi.CompanyScoutsListCompanyScouts400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CompanyScoutsListCompanyScouts200JSONResponse(*presenter.ScoutMessagesResponse(msgs, total)), nil
}

// GetDetail handles GET /api/company/scouts/{scoutId}.
func (c *ScoutController) GetDetail(ctx context.Context, req openapi.CompanyScoutsGetCompanyScoutDetailRequestObject) (openapi.CompanyScoutsGetCompanyScoutDetailResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)

	msg, replies, err := c.input.GetDetail(ctx, companyID, req.ScoutId)
	if err != nil {
		switch errorStatus(err) {
		case http.StatusForbidden:
			return openapi.CompanyScoutsGetCompanyScoutDetail403JSONResponse(forbiddenBody(err)), nil
		case http.StatusNotFound:
			return openapi.CompanyScoutsGetCompanyScoutDetail404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CompanyScoutsGetCompanyScoutDetail400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CompanyScoutsGetCompanyScoutDetail200JSONResponse(*presenter.ScoutDetailResponse(msg, replies)), nil
}

// GetCredits handles GET /api/company/scouts/credits.
func (c *ScoutController) GetCredits(ctx context.Context, _ openapi.CompanyScoutsGetScoutCreditsRequestObject) (openapi.CompanyScoutsGetScoutCreditsResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)

	credit, err := c.input.GetCredits(ctx, companyID)
	if err != nil {
		if errorStatus(err) == http.StatusBadRequest {
			return openapi.CompanyScoutsGetScoutCredits400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CompanyScoutsGetScoutCredits200JSONResponse(*presenter.ScoutCreditsResponse(credit)), nil
}

// GetQualityScore handles GET /api/company/scouts/quality.
func (c *ScoutController) GetQualityScore(ctx context.Context, _ openapi.CompanyScoutsGetScoutQualityRequestObject) (openapi.CompanyScoutsGetScoutQualityResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)

	quality, err := c.input.GetQualityScore(ctx, companyID)
	if err != nil {
		if errorStatus(err) == http.StatusBadRequest {
			return openapi.CompanyScoutsGetScoutQuality400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CompanyScoutsGetScoutQuality200JSONResponse(*presenter.ScoutQualityResponse(quality)), nil
}

// GetDashboard handles GET /api/company/scouts/dashboard.
func (c *ScoutController) GetDashboard(ctx context.Context, _ openapi.CompanyScoutsGetScoutDashboardRequestObject) (openapi.CompanyScoutsGetScoutDashboardResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)

	stats, err := c.input.GetDashboard(ctx, companyID)
	if err != nil {
		if errorStatus(err) == http.StatusBadRequest {
			return openapi.CompanyScoutsGetScoutDashboard400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CompanyScoutsGetScoutDashboard200JSONResponse(*presenter.ScoutDashboardResponse(stats)), nil
}

// Reply handles POST /api/company/scouts/{scoutId}/reply.
func (c *ScoutController) Reply(ctx context.Context, req openapi.CompanyScoutsCompanyScoutReplyRequestObject) (openapi.CompanyScoutsCompanyScoutReplyResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)
	if req.Body == nil {
		return openapi.CompanyScoutsCompanyScoutReply400JSONResponse(badRequestBody("invalid request body")), nil
	}

	if err := c.input.CompanyReply(ctx, companyID, req.ScoutId, req.Body.Body); err != nil {
		switch errorStatus(err) {
		case http.StatusForbidden:
			return openapi.CompanyScoutsCompanyScoutReply403JSONResponse(forbiddenBody(err)), nil
		case http.StatusNotFound:
			return openapi.CompanyScoutsCompanyScoutReply404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CompanyScoutsCompanyScoutReply400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CompanyScoutsCompanyScoutReply201Response{}, nil
}
