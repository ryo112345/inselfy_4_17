package controller

import (
	"context"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type SavedCandidateController struct {
	input port.SavedCandidateInputPort
}

func NewSavedCandidateController(input port.SavedCandidateInputPort) *SavedCandidateController {
	return &SavedCandidateController{input: input}
}

// Save handles POST /api/company/saved-candidates/{userId}.
func (c *SavedCandidateController) Save(ctx context.Context, req openapi.SavedCandidatesSaveCandidateRequestObject) (openapi.SavedCandidatesSaveCandidateResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)

	if err := c.input.Save(ctx, companyID, req.UserId); err != nil {
		return nil, err
	}
	return openapi.SavedCandidatesSaveCandidate204Response{}, nil
}

// Unsave handles DELETE /api/company/saved-candidates/{userId}.
func (c *SavedCandidateController) Unsave(ctx context.Context, req openapi.SavedCandidatesUnsaveCandidateRequestObject) (openapi.SavedCandidatesUnsaveCandidateResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)

	if err := c.input.Unsave(ctx, companyID, req.UserId); err != nil {
		return nil, err
	}
	return openapi.SavedCandidatesUnsaveCandidate204Response{}, nil
}

// List handles GET /api/company/saved-candidates.
func (c *SavedCandidateController) List(ctx context.Context, req openapi.SavedCandidatesListSavedCandidatesRequestObject) (openapi.SavedCandidatesListSavedCandidatesResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)

	limit := derefInt32(req.Params.Limit)
	if limit < 1 || limit > 100 {
		limit = 20
	}
	offset := derefInt32(req.Params.Offset)
	if offset < 0 {
		offset = 0
	}

	cards, total, err := c.input.List(ctx, companyID, limit, offset)
	if err != nil {
		return nil, err
	}
	return openapi.SavedCandidatesListSavedCandidates200JSONResponse(*presenter.TalentListResponse(cards, total)), nil
}

// IsSaved handles GET /api/company/saved-candidates/{userId}.
func (c *SavedCandidateController) IsSaved(ctx context.Context, req openapi.SavedCandidatesIsCandidateSavedRequestObject) (openapi.SavedCandidatesIsCandidateSavedResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)

	exists, err := c.input.IsSaved(ctx, companyID, req.UserId)
	if err != nil {
		return nil, err
	}
	return openapi.SavedCandidatesIsCandidateSaved200JSONResponse(openapi.ModelsSavedResponse{Saved: exists}), nil
}

// BulkCheck handles POST /api/company/saved-candidates/bulk-check.
func (c *SavedCandidateController) BulkCheck(ctx context.Context, req openapi.SavedCandidatesBulkCheckSavedRequestObject) (openapi.SavedCandidatesBulkCheckSavedResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)
	if req.Body == nil {
		return openapi.SavedCandidatesBulkCheckSaved400JSONResponse(badRequestBody("invalid body")), nil
	}

	savedSet, err := c.input.SavedSet(ctx, companyID, req.Body.UserIds)
	if err != nil {
		return nil, err
	}
	return openapi.SavedCandidatesBulkCheckSaved200JSONResponse(openapi.ModelsBulkSavedResponse{Saved: savedSet}), nil
}

// Count handles GET /api/company/saved-candidates/count.
func (c *SavedCandidateController) Count(ctx context.Context, _ openapi.SavedCandidatesCountSavedCandidatesRequestObject) (openapi.SavedCandidatesCountSavedCandidatesResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)

	count, err := c.input.Count(ctx, companyID)
	if err != nil {
		return nil, err
	}
	return openapi.SavedCandidatesCountSavedCandidates200JSONResponse(openapi.ModelsSavedCountResponse{Count: count}), nil
}
