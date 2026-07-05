package controller

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/domain/careerinterest"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type CareerInterestController struct {
	input port.CareerInterestInputPort
}

func NewCareerInterestController(input port.CareerInterestInputPort) *CareerInterestController {
	return &CareerInterestController{input: input}
}

type ciStartSessionRequest struct {
	UserID string `json:"user_id"`
}

func (c *CareerInterestController) StartSession(ctx echo.Context) error {
	var body ciStartSessionRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid body")
	}
	if body.UserID == "" {
		return badRequest(ctx, "user_id is required")
	}

	s, err := c.input.StartSession(ctx.Request().Context(), body.UserID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, presenter.CareerInterestSessionResponse(s))
}

type ciSubmitResultRequest struct {
	Responses []careerinterest.Response `json:"responses"`
}

func (c *CareerInterestController) SubmitResult(ctx echo.Context, sessionID string) error {
	var body ciSubmitResultRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid body")
	}

	input := careerinterest.SubmitInput{
		Responses: body.Responses,
	}
	r, err := c.input.SubmitResult(ctx.Request().Context(), sessionID, input)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, presenter.CareerInterestResultResponse(r))
}

func (c *CareerInterestController) GetLatestResult(ctx echo.Context, userID string) error {
	r, err := c.input.GetLatestResult(ctx.Request().Context(), userID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.CareerInterestResultResponse(r))
}

func (c *CareerInterestController) GetResultBySessionID(ctx echo.Context, sessionID string) error {
	r, err := c.input.GetResultBySessionID(ctx.Request().Context(), sessionID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.CareerInterestResultResponse(r))
}
