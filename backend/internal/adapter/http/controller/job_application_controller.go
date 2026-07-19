package controller

import (
	"context"
	"net/http"
	"time"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/domain/jobapplication"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type JobApplicationController struct {
	input port.JobApplicationInputPort
}

func NewJobApplicationController(input port.JobApplicationInputPort) *JobApplicationController {
	return &JobApplicationController{input: input}
}

// Apply handles POST /api/applications.
func (c *JobApplicationController) Apply(ctx context.Context, req openapi.CandidateApplicationsApplyToJobRequestObject) (openapi.CandidateApplicationsApplyToJobResponseObject, error) {
	userID := authmw.UserIDFromContext(ctx)
	if req.Body == nil {
		return openapi.CandidateApplicationsApplyToJob400JSONResponse(badRequestBody("invalid request body")), nil
	}

	a, err := c.input.Apply(ctx, jobapplication.ApplyInput{
		JobPostingID: req.Body.JobPostingId,
		CandidateID:  userID,
		Message:      req.Body.Message,
	})
	if err != nil {
		switch errorStatus(err) {
		case http.StatusConflict:
			return openapi.CandidateApplicationsApplyToJob409JSONResponse(conflictBody(err)), nil
		case http.StatusNotFound:
			return openapi.CandidateApplicationsApplyToJob404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CandidateApplicationsApplyToJob400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CandidateApplicationsApplyToJob201JSONResponse(*presenter.JobApplicationSingleResponse(a)), nil
}

// ListByCompany handles GET /api/company/applications.
func (c *JobApplicationController) ListByCompany(ctx context.Context, req openapi.CompanyApplicationsListCompanyApplicationsRequestObject) (openapi.CompanyApplicationsListCompanyApplicationsResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)

	filter := jobapplication.ListFilter{}
	if s := derefString(req.Params.Status); s != "" {
		filter.Status = &s
	}
	if jp := derefString(req.Params.JobPostingId); jp != "" {
		filter.JobPostingID = &jp
	}
	if kw := derefString(req.Params.Keyword); kw != "" {
		filter.Keyword = &kw
	}
	if df := derefString(req.Params.DateFrom); df != "" {
		if t, err := time.Parse(time.RFC3339, df); err == nil {
			filter.DateFrom = &t
		}
	}
	if dt := derefString(req.Params.DateTo); dt != "" {
		if t, err := time.Parse(time.RFC3339, dt); err == nil {
			filter.DateTo = &t
		}
	}
	filter.Limit = derefInt32(req.Params.Limit)
	filter.Offset = derefInt32(req.Params.Offset)

	apps, total, err := c.input.ListByCompany(ctx, companyID, filter)
	if err != nil {
		if errorStatus(err) == http.StatusBadRequest {
			return openapi.CompanyApplicationsListCompanyApplications400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CompanyApplicationsListCompanyApplications200JSONResponse(*presenter.JobApplicationsListResponse(apps, total)), nil
}

// ListByCandidate handles GET /api/applications.
func (c *JobApplicationController) ListByCandidate(ctx context.Context, _ openapi.CandidateApplicationsListCandidateApplicationsRequestObject) (openapi.CandidateApplicationsListCandidateApplicationsResponseObject, error) {
	userID := authmw.UserIDFromContext(ctx)

	apps, total, err := c.input.ListByCandidate(ctx, userID)
	if err != nil {
		if errorStatus(err) == http.StatusBadRequest {
			return openapi.CandidateApplicationsListCandidateApplications400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CandidateApplicationsListCandidateApplications200JSONResponse(*presenter.JobApplicationsListResponse(apps, total)), nil
}

// GetByID handles GET /api/company/applications/{applicationId}.
func (c *JobApplicationController) GetByID(ctx context.Context, req openapi.CompanyApplicationsGetApplicationRequestObject) (openapi.CompanyApplicationsGetApplicationResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)

	a, err := c.input.GetByID(ctx, companyID, req.ApplicationId)
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.CompanyApplicationsGetApplication404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CompanyApplicationsGetApplication400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CompanyApplicationsGetApplication200JSONResponse(*presenter.JobApplicationSingleResponse(a)), nil
}

// UpdateStatus handles PATCH /api/company/applications/{applicationId}/status.
func (c *JobApplicationController) UpdateStatus(ctx context.Context, req openapi.CompanyApplicationsUpdateApplicationStatusRequestObject) (openapi.CompanyApplicationsUpdateApplicationStatusResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)
	if req.Body == nil {
		return openapi.CompanyApplicationsUpdateApplicationStatus400JSONResponse(badRequestBody("invalid request body")), nil
	}

	if err := c.input.UpdateStatus(ctx, companyID, req.ApplicationId, jobapplication.Status(req.Body.Status)); err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.CompanyApplicationsUpdateApplicationStatus404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CompanyApplicationsUpdateApplicationStatus400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CompanyApplicationsUpdateApplicationStatus200JSONResponse(openapi.ModelsStatusOkResponse{Status: "ok"}), nil
}

// Withdraw handles POST /api/applications/{applicationId}/withdraw.
func (c *JobApplicationController) Withdraw(ctx context.Context, req openapi.CandidateApplicationsWithdrawApplicationRequestObject) (openapi.CandidateApplicationsWithdrawApplicationResponseObject, error) {
	userID := authmw.UserIDFromContext(ctx)

	if err := c.input.Withdraw(ctx, userID, req.ApplicationId); err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.CandidateApplicationsWithdrawApplication404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CandidateApplicationsWithdrawApplication400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CandidateApplicationsWithdrawApplication200JSONResponse(openapi.ModelsStatusOkResponse{Status: "ok"}), nil
}

// CheckApplied handles GET /api/applications/check.
func (c *JobApplicationController) CheckApplied(ctx context.Context, req openapi.CandidateApplicationsCheckAppliedRequestObject) (openapi.CandidateApplicationsCheckAppliedResponseObject, error) {
	userID := authmw.UserIDFromContext(ctx)

	applied, err := c.input.CheckApplied(ctx, userID, req.Params.JobPostingId)
	if err != nil {
		if errorStatus(err) == http.StatusBadRequest {
			return openapi.CandidateApplicationsCheckApplied400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CandidateApplicationsCheckApplied200JSONResponse(*presenter.JobApplicationAppliedResponse(applied)), nil
}
