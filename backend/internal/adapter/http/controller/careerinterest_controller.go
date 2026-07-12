package controller

import (
	"net/http"

	"github.com/labstack/echo/v4"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
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

func (c *CareerInterestController) StartSession(ctx echo.Context) error {
	s, err := c.input.StartSession(ctx.Request().Context(), authmw.UserID(ctx))
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, presenter.CareerInterestSessionResponse(s))
}

func (c *CareerInterestController) SubmitResult(ctx echo.Context, sessionID string) error {
	var body openapi.ModelsCISubmitResultRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid body")
	}

	r, err := c.input.SubmitResult(ctx.Request().Context(), sessionID, authmw.UserID(ctx), ciSubmitInputFromBody(body))
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, presenter.CareerInterestResultResponse(r))
}

func ciSubmitInputFromBody(body openapi.ModelsCISubmitResultRequest) careerinterest.SubmitInput {
	responses := make([]careerinterest.Response, len(body.Responses))
	for i, r := range body.Responses {
		responses[i] = careerinterest.Response{
			QuestionNumber: int(r.QuestionNumber),
			ItemCode:       r.ItemCode,
			Score:          int(r.Score),
		}
	}
	return careerinterest.SubmitInput{
		Responses: responses,
	}
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

func (c *CareerInterestController) RequestAiReport(ctx echo.Context, sessionID string) error {
	if err := c.input.RequestAiReport(ctx.Request().Context(), sessionID, authmw.UserID(ctx)); err != nil {
		return handleError(ctx, err)
	}
	return ctx.NoContent(http.StatusNoContent)
}
