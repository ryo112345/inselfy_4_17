package controller

import (
	"net/http"

	"github.com/labstack/echo/v4"

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
func (c *ScoutSettingsController) Get(ctx echo.Context) error {
	userID := authmw.UserID(ctx)

	settings, err := c.input.GetScoutSettings(ctx.Request().Context(), userID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.ScoutSettingsResponse(settings))
}

// Update handles PUT /api/scout-settings.
func (c *ScoutSettingsController) Update(ctx echo.Context) error {
	userID := authmw.UserID(ctx)

	var body openapi.ModelsUpdateScoutSettingsRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request body")
	}

	settings, err := c.input.UpdateScoutSettings(ctx.Request().Context(), userID, body.AcceptingScouts)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.ScoutSettingsResponse(settings))
}
