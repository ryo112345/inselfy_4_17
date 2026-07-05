package controller

import (
	"net/http"

	"github.com/labstack/echo/v4"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/domain/workvalues"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type WorkValuesController struct {
	input port.WorkValuesInputPort
}

func NewWorkValuesController(
	input port.WorkValuesInputPort,
) *WorkValuesController {
	return &WorkValuesController{input: input}
}

func (c *WorkValuesController) StartSession(ctx echo.Context) error {
	var body openapi.ModelsWVStartSessionRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid body")
	}
	if body.UserId == "" {
		return badRequest(ctx, "user_id is required")
	}

	s, err := c.input.StartSession(ctx.Request().Context(), body.UserId)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, presenter.WorkValuesSessionResponse(s))
}

func (c *WorkValuesController) SubmitResult(ctx echo.Context, sessionID string) error {
	var body openapi.ModelsWVSubmitResultRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid body")
	}

	responses := make([]workvalues.Response, len(body.Responses))
	for i, r := range body.Responses {
		responses[i] = workvalues.Response{
			NeedA:          r.NeedA,
			NeedB:          r.NeedB,
			Winner:         r.Winner,
			QuestionNumber: int(r.QuestionNumber),
		}
	}
	input := workvalues.SubmitInput{
		Responses: responses,
		Mu:        body.Mu,
		SE:        body.Se,
	}
	r, err := c.input.SubmitResult(ctx.Request().Context(), sessionID, input)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, presenter.WorkValuesResultResponse(r))
}

func (c *WorkValuesController) GetLatestResult(ctx echo.Context, userID string) error {
	r, err := c.input.GetLatestResult(ctx.Request().Context(), userID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.WorkValuesResultResponse(r))
}

func (c *WorkValuesController) GetResultBySessionID(ctx echo.Context, sessionID string) error {
	r, err := c.input.GetResultBySessionID(ctx.Request().Context(), sessionID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.WorkValuesResultResponse(r))
}
