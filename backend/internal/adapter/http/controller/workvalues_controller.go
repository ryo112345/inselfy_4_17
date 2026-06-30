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
		output port.WorkValuesOutputPort,
	) port.WorkValuesInputPort
	outputFactory      func() *presenter.WorkValuesPresenter
	sessionRepoFactory func() port.WorkValuesSessionRepository
	resultRepoFactory  func() port.WorkValuesResultRepository
	scoreRepoFactory   func() port.WorkValuesScoreRepository
}

func NewWorkValuesController(
	inputFactory func(
		sessionRepo port.WorkValuesSessionRepository,
		resultRepo port.WorkValuesResultRepository,
		scoreRepo port.WorkValuesScoreRepository,
		output port.WorkValuesOutputPort,
	) port.WorkValuesInputPort,
	outputFactory func() *presenter.WorkValuesPresenter,
	sessionRepoFactory func() port.WorkValuesSessionRepository,
	resultRepoFactory func() port.WorkValuesResultRepository,
	scoreRepoFactory func() port.WorkValuesScoreRepository,
) *WorkValuesController {
	return &WorkValuesController{
		inputFactory:       inputFactory,
		outputFactory:      outputFactory,
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

	in, p := c.newIO()
	if err := in.StartSession(ctx.Request().Context(), body.UserID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, p.Session())
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

	in, p := c.newIO()
	input := workvalues.SubmitInput{
		Responses: body.Responses,
		Mu:        body.Mu,
		SE:        body.SE,
	}
	if err := in.SubmitResult(ctx.Request().Context(), sessionID, input); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, p.Result())
}

func (c *WorkValuesController) GetLatestResult(ctx echo.Context, userID string) error {
	in, p := c.newIO()
	if err := in.GetLatestResult(ctx.Request().Context(), userID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.Result())
}

func (c *WorkValuesController) GetResultBySessionID(ctx echo.Context, sessionID string) error {
	in, p := c.newIO()
	if err := in.GetResultBySessionID(ctx.Request().Context(), sessionID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.Result())
}

func (c *WorkValuesController) newIO() (port.WorkValuesInputPort, *presenter.WorkValuesPresenter) {
	output := c.outputFactory()
	input := c.inputFactory(c.sessionRepoFactory(), c.resultRepoFactory(), c.scoreRepoFactory(), output)
	return input, output
}
