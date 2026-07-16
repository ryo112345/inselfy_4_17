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

// ScoutTemplateController handles scout template CRUD HTTP endpoints.
type ScoutTemplateController struct {
	input port.ScoutTemplateInputPort
}

// NewScoutTemplateController creates a ScoutTemplateController.
func NewScoutTemplateController(
	input port.ScoutTemplateInputPort,
) *ScoutTemplateController {
	return &ScoutTemplateController{input: input}
}

// Create handles POST /api/company/scout-templates.
func (c *ScoutTemplateController) Create(ctx context.Context, req openapi.ScoutTemplatesCreateScoutTemplateRequestObject) (openapi.ScoutTemplatesCreateScoutTemplateResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)
	if req.Body == nil {
		return openapi.ScoutTemplatesCreateScoutTemplate400JSONResponse(badRequestBody("invalid request body")), nil
	}

	t, err := c.input.Create(ctx, scout.CreateTemplateInput{
		CompanyID: companyID,
		Name:      req.Body.Name,
		Subject:   req.Body.Subject,
		Body:      req.Body.Body,
	})
	if err != nil {
		switch errorStatus(err) {
		case http.StatusConflict:
			return openapi.ScoutTemplatesCreateScoutTemplate409JSONResponse(conflictBody(err)), nil
		case http.StatusBadRequest:
			return openapi.ScoutTemplatesCreateScoutTemplate400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.ScoutTemplatesCreateScoutTemplate201JSONResponse(*presenter.ScoutTemplateResponse(t)), nil
}

// List handles GET /api/company/scout-templates.
func (c *ScoutTemplateController) List(ctx context.Context, _ openapi.ScoutTemplatesListScoutTemplatesRequestObject) (openapi.ScoutTemplatesListScoutTemplatesResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)

	ts, err := c.input.List(ctx, companyID)
	if err != nil {
		if errorStatus(err) == http.StatusBadRequest {
			return openapi.ScoutTemplatesListScoutTemplates400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.ScoutTemplatesListScoutTemplates200JSONResponse(*presenter.ScoutTemplatesResponse(ts)), nil
}

// Get handles GET /api/company/scout-templates/{templateId}.
func (c *ScoutTemplateController) Get(ctx context.Context, req openapi.ScoutTemplatesGetScoutTemplateRequestObject) (openapi.ScoutTemplatesGetScoutTemplateResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)

	t, err := c.input.Get(ctx, companyID, req.TemplateId)
	if err != nil {
		switch errorStatus(err) {
		case http.StatusForbidden:
			return openapi.ScoutTemplatesGetScoutTemplate403JSONResponse(forbiddenBody(err)), nil
		case http.StatusNotFound:
			return openapi.ScoutTemplatesGetScoutTemplate404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.ScoutTemplatesGetScoutTemplate400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.ScoutTemplatesGetScoutTemplate200JSONResponse(*presenter.ScoutTemplateResponse(t)), nil
}

// Update handles PUT /api/company/scout-templates/{templateId}.
func (c *ScoutTemplateController) Update(ctx context.Context, req openapi.ScoutTemplatesUpdateScoutTemplateRequestObject) (openapi.ScoutTemplatesUpdateScoutTemplateResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)
	if req.Body == nil {
		return openapi.ScoutTemplatesUpdateScoutTemplate400JSONResponse(badRequestBody("invalid request body")), nil
	}

	t, err := c.input.Update(ctx, companyID, req.TemplateId, scout.UpdateTemplateInput{
		Name:    req.Body.Name,
		Subject: req.Body.Subject,
		Body:    req.Body.Body,
	})
	if err != nil {
		switch errorStatus(err) {
		case http.StatusForbidden:
			return openapi.ScoutTemplatesUpdateScoutTemplate403JSONResponse(forbiddenBody(err)), nil
		case http.StatusNotFound:
			return openapi.ScoutTemplatesUpdateScoutTemplate404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.ScoutTemplatesUpdateScoutTemplate400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.ScoutTemplatesUpdateScoutTemplate200JSONResponse(*presenter.ScoutTemplateResponse(t)), nil
}

// Delete handles DELETE /api/company/scout-templates/{templateId}.
func (c *ScoutTemplateController) Delete(ctx context.Context, req openapi.ScoutTemplatesDeleteScoutTemplateRequestObject) (openapi.ScoutTemplatesDeleteScoutTemplateResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)

	if err := c.input.Delete(ctx, companyID, req.TemplateId); err != nil {
		switch errorStatus(err) {
		case http.StatusForbidden:
			return openapi.ScoutTemplatesDeleteScoutTemplate403JSONResponse(forbiddenBody(err)), nil
		case http.StatusNotFound:
			return openapi.ScoutTemplatesDeleteScoutTemplate404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.ScoutTemplatesDeleteScoutTemplate400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.ScoutTemplatesDeleteScoutTemplate204Response{}, nil
}
