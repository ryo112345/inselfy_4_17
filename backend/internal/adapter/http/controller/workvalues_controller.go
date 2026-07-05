package controller

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/domain/workvalues"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type WorkValuesController struct {
	inputFactory func(
		sessionRepo port.WorkValuesSessionRepository,
		resultRepo port.WorkValuesResultRepository,
		scoreRepo port.WorkValuesScoreRepository,
	) port.WorkValuesInputPort
	sessionRepoFactory func() port.WorkValuesSessionRepository
	resultRepoFactory  func() port.WorkValuesResultRepository
	scoreRepoFactory   func() port.WorkValuesScoreRepository
}

func NewWorkValuesController(
	inputFactory func(
		sessionRepo port.WorkValuesSessionRepository,
		resultRepo port.WorkValuesResultRepository,
		scoreRepo port.WorkValuesScoreRepository,
	) port.WorkValuesInputPort,
	sessionRepoFactory func() port.WorkValuesSessionRepository,
	resultRepoFactory func() port.WorkValuesResultRepository,
	scoreRepoFactory func() port.WorkValuesScoreRepository,
) *WorkValuesController {
	return &WorkValuesController{
		inputFactory:       inputFactory,
		sessionRepoFactory: sessionRepoFactory,
		resultRepoFactory:  resultRepoFactory,
		scoreRepoFactory:   scoreRepoFactory,
	}
}

type startSessionRequest struct {
	UserID string `json:"user_id"`
}

func (c *WorkValuesController) StartSession(ctx echo.Context) error {
	var body startSessionRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid body")
	}
	if body.UserID == "" {
		return badRequest(ctx, "user_id is required")
	}

	s, err := c.newInput().StartSession(ctx.Request().Context(), body.UserID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, presenter.WorkValuesSessionResponse(s))
}

type submitResultRequest struct {
	Responses []workvalues.Response `json:"responses"`
	Mu        map[string]float64    `json:"mu"`
	SE        map[string]float64    `json:"se"`
}

func (c *WorkValuesController) SubmitResult(ctx echo.Context, sessionID string) error {
	var body submitResultRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid body")
	}

	input := workvalues.SubmitInput{
		Responses: body.Responses,
		Mu:        body.Mu,
		SE:        body.SE,
	}
	r, err := c.newInput().SubmitResult(ctx.Request().Context(), sessionID, input)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, presenter.WorkValuesResultResponse(r))
}

func (c *WorkValuesController) GetLatestResult(ctx echo.Context, userID string) error {
	r, err := c.newInput().GetLatestResult(ctx.Request().Context(), userID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.WorkValuesResultResponse(r))
}

func (c *WorkValuesController) GetResultBySessionID(ctx echo.Context, sessionID string) error {
	r, err := c.newInput().GetResultBySessionID(ctx.Request().Context(), sessionID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.WorkValuesResultResponse(r))
}

func (c *WorkValuesController) newInput() port.WorkValuesInputPort {
	return c.inputFactory(c.sessionRepoFactory(), c.resultRepoFactory(), c.scoreRepoFactory())
}
