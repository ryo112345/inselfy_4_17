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
	input   port.TeamDiagnoseInputPort
	wvInput port.WorkValuesInputPort
	ciInput port.CareerInterestInputPort
}

func NewTeamDiagnoseController(
	input port.TeamDiagnoseInputPort,
	wvInput port.WorkValuesInputPort,
	ciInput port.CareerInterestInputPort,
) *TeamDiagnoseController {
	return &TeamDiagnoseController{input: input, wvInput: wvInput, ciInput: ciInput}
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

// resolveMemberUserID validates the invite token and returns the member's user ID.
// The token itself is the authorization: only invitees who received the link can act
// as the member it points to.
func (c *TeamDiagnoseController) resolveMemberUserID(ctx echo.Context, token string) (string, error) {
	info, err := c.input.GetByToken(ctx.Request().Context(), token)
	if err != nil {
		return "", err
	}
	return info.UserID, nil
}

// StartWVSession starts a work-values session for the member behind the invite token.
func (c *TeamDiagnoseController) StartWVSession(ctx echo.Context, token string) error {
	userID, err := c.resolveMemberUserID(ctx, token)
	if err != nil {
		if errors.Is(err, domainerr.ErrNotFound) {
			return notFoundError(ctx, "無効なリンクです")
		}
		return internalError(ctx, err.Error())
	}

	s, err := c.wvInput.StartSession(ctx.Request().Context(), userID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, presenter.WorkValuesSessionResponse(s))
}

// SubmitWVResult submits work-values responses for the member behind the invite token.
func (c *TeamDiagnoseController) SubmitWVResult(ctx echo.Context, token, sessionID string) error {
	userID, err := c.resolveMemberUserID(ctx, token)
	if err != nil {
		if errors.Is(err, domainerr.ErrNotFound) {
			return notFoundError(ctx, "無効なリンクです")
		}
		return internalError(ctx, err.Error())
	}

	var body openapi.ModelsWVSubmitResultRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid body")
	}

	r, err := c.wvInput.SubmitResult(ctx.Request().Context(), sessionID, userID, wvSubmitInputFromBody(body))
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, presenter.WorkValuesResultResponse(r))
}

// StartCISession starts a career-interest session for the member behind the invite token.
func (c *TeamDiagnoseController) StartCISession(ctx echo.Context, token string) error {
	userID, err := c.resolveMemberUserID(ctx, token)
	if err != nil {
		if errors.Is(err, domainerr.ErrNotFound) {
			return notFoundError(ctx, "無効なリンクです")
		}
		return internalError(ctx, err.Error())
	}

	s, err := c.ciInput.StartSession(ctx.Request().Context(), userID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, presenter.CareerInterestSessionResponse(s))
}

// SubmitCIResult submits career-interest responses for the member behind the invite token.
func (c *TeamDiagnoseController) SubmitCIResult(ctx echo.Context, token, sessionID string) error {
	userID, err := c.resolveMemberUserID(ctx, token)
	if err != nil {
		if errors.Is(err, domainerr.ErrNotFound) {
			return notFoundError(ctx, "無効なリンクです")
		}
		return internalError(ctx, err.Error())
	}

	var body openapi.ModelsCISubmitResultRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid body")
	}

	r, err := c.ciInput.SubmitResult(ctx.Request().Context(), sessionID, userID, ciSubmitInputFromBody(body))
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, presenter.CareerInterestResultResponse(r))
}

func (c *TeamDiagnoseController) UpdateStatus(ctx echo.Context, token string) error {
	var body openapi.ModelsUpdateDiagnoseStatusRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request")
	}

	if err := c.input.UpdateStatus(ctx.Request().Context(), token, (*string)(body.WvStatus), (*string)(body.CiStatus)); err != nil {
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
