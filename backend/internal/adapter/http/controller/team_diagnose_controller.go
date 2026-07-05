package controller

import (
	"errors"
	"net/http"

	"github.com/labstack/echo/v4"

	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type TeamDiagnoseController struct {
	input port.TeamDiagnoseInputPort
}

func NewTeamDiagnoseController(input port.TeamDiagnoseInputPort) *TeamDiagnoseController {
	return &TeamDiagnoseController{input: input}
}

type diagnoseInfoResponse struct {
	MemberID    string  `json:"member_id"`
	MemberName  string  `json:"member_name"`
	TeamName    string  `json:"team_name"`
	CompanyName string  `json:"company_name"`
	UserID      string  `json:"user_id"`
	WVStatus    string  `json:"wv_status"`
	CIStatus    string  `json:"ci_status"`
	Email       *string `json:"email"`
}

func (c *TeamDiagnoseController) GetByToken(ctx echo.Context, token string) error {
	info, err := c.input.GetByToken(ctx.Request().Context(), token)
	if err != nil {
		if errors.Is(err, domainerr.ErrNotFound) {
			return notFoundError(ctx, "無効なリンクです")
		}
		return internalError(ctx, err.Error())
	}

	return ctx.JSON(http.StatusOK, diagnoseInfoResponse{
		MemberID:    info.MemberID,
		MemberName:  info.MemberName,
		TeamName:    info.TeamName,
		CompanyName: info.CompanyName,
		UserID:      info.UserID,
		WVStatus:    info.WVStatus,
		CIStatus:    info.CIStatus,
		Email:       info.Email,
	})
}

func (c *TeamDiagnoseController) UpdateStatus(ctx echo.Context, token string) error {
	var body struct {
		WVStatus *string `json:"wv_status"`
		CIStatus *string `json:"ci_status"`
	}
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request")
	}

	if err := c.input.UpdateStatus(ctx.Request().Context(), token, body.WVStatus, body.CIStatus); err != nil {
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
