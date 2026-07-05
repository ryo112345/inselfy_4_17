package controller

import (
	"errors"
	"net/http"

	"github.com/labstack/echo/v4"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type TeamDiagnoseController struct {
	input port.TeamDiagnoseInputPort
}

func NewTeamDiagnoseController(input port.TeamDiagnoseInputPort) *TeamDiagnoseController {
	return &TeamDiagnoseController{input: input}
}

func (c *TeamDiagnoseController) GetByToken(ctx echo.Context, token string) error {
	info, err := c.input.GetByToken(ctx.Request().Context(), token)
	if err != nil {
		if errors.Is(err, domainerr.ErrNotFound) {
			return notFoundError(ctx, "無効なリンクです")
		}
		return internalError(ctx, err.Error())
	}

	return ctx.JSON(http.StatusOK, presenter.DiagnoseInfoResponse(info))
}

func (c *TeamDiagnoseController) UpdateStatus(ctx echo.Context, token string) error {
	var body openapi.ModelsUpdateDiagnoseStatusRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request")
	}

	if err := c.input.UpdateStatus(ctx.Request().Context(), token, body.WvStatus, body.CiStatus); err != nil {
		switch {
		case errors.Is(err, domainerr.ErrBadRequest):
			return badRequest(ctx, err.Error())
		case errors.Is(err, domainerr.ErrNotFound):
			return notFoundError(ctx, "member not found")
		default:
			return internalError(ctx, err.Error())
		}
	}

	return ctx.NoContent(http.StatusNoContent)
}
