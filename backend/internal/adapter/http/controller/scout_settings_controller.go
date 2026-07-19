package controller

import (
	"context"
	"net/http"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// ScoutSettingsController handles user scout settings HTTP endpoints.
type ScoutSettingsController struct {
	input port.ScoutInputPort
}

// NewScoutSettingsController creates a ScoutSettingsController.
func NewScoutSettingsController(input port.ScoutInputPort) *ScoutSettingsController {
	return &ScoutSettingsController{input: input}
}

// Get handles GET /api/scout-settings.
func (c *ScoutSettingsController) Get(ctx context.Context, _ openapi.ScoutSettingsGetScoutSettingsRequestObject) (openapi.ScoutSettingsGetScoutSettingsResponseObject, error) {
	userID := authmw.UserIDFromContext(ctx)

	settings, err := c.input.GetScoutSettings(ctx, userID)
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.ScoutSettingsGetScoutSettings404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.ScoutSettingsGetScoutSettings400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.ScoutSettingsGetScoutSettings200JSONResponse(*presenter.ScoutSettingsResponse(settings)), nil
}

// Update handles PUT /api/scout-settings.
func (c *ScoutSettingsController) Update(ctx context.Context, req openapi.ScoutSettingsUpdateScoutSettingsRequestObject) (openapi.ScoutSettingsUpdateScoutSettingsResponseObject, error) {
	userID := authmw.UserIDFromContext(ctx)
	if req.Body == nil {
		return openapi.ScoutSettingsUpdateScoutSettings400JSONResponse(badRequestBody("invalid request body")), nil
	}

	settings, err := c.input.UpdateScoutSettings(ctx, userID, req.Body.AcceptingScouts)
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.ScoutSettingsUpdateScoutSettings404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.ScoutSettingsUpdateScoutSettings400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.ScoutSettingsUpdateScoutSettings200JSONResponse(*presenter.ScoutSettingsResponse(settings)), nil
}
