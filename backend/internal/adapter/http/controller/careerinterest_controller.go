package controller

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/domain/careerinterest"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type CareerInterestController struct {
	inputFactory func(
		sessionRepo port.CareerInterestSessionRepository,
		resultRepo port.CareerInterestResultRepository,
		basicScoreRepo port.CareerInterestBasicScoreRepository,
		typeScoreRepo port.CareerInterestTypeScoreRepository,
		output port.CareerInterestOutputPort,
	) port.CareerInterestInputPort
	outputFactory         func() *presenter.CareerInterestPresenter
	sessionRepoFactory    func() port.CareerInterestSessionRepository
	resultRepoFactory     func() port.CareerInterestResultRepository
	basicScoreRepoFactory func() port.CareerInterestBasicScoreRepository
	typeScoreRepoFactory  func() port.CareerInterestTypeScoreRepository
}

func NewCareerInterestController(
	inputFactory func(
		sessionRepo port.CareerInterestSessionRepository,
		resultRepo port.CareerInterestResultRepository,
		basicScoreRepo port.CareerInterestBasicScoreRepository,
		typeScoreRepo port.CareerInterestTypeScoreRepository,
		output port.CareerInterestOutputPort,
	) port.CareerInterestInputPort,
	outputFactory func() *presenter.CareerInterestPresenter,
	sessionRepoFactory func() port.CareerInterestSessionRepository,
	resultRepoFactory func() port.CareerInterestResultRepository,
	basicScoreRepoFactory func() port.CareerInterestBasicScoreRepository,
	typeScoreRepoFactory func() port.CareerInterestTypeScoreRepository,
) *CareerInterestController {
	return &CareerInterestController{
		inputFactory:          inputFactory,
		outputFactory:         outputFactory,
		sessionRepoFactory:    sessionRepoFactory,
		resultRepoFactory:     resultRepoFactory,
		basicScoreRepoFactory: basicScoreRepoFactory,
		typeScoreRepoFactory:  typeScoreRepoFactory,
	}
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

	in, p := c.newIO()
	if err := in.StartSession(ctx.Request().Context(), body.UserID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, p.Session())
}

type ciSubmitResultRequest struct {
	Responses []careerinterest.Response `json:"responses"`
}

func (c *CareerInterestController) SubmitResult(ctx echo.Context, sessionID string) error {
	var body ciSubmitResultRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid body")
	}

	in, p := c.newIO()
	input := careerinterest.SubmitInput{
		Responses: body.Responses,
	}
	if err := in.SubmitResult(ctx.Request().Context(), sessionID, input); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, p.Result())
}

func (c *CareerInterestController) GetLatestResult(ctx echo.Context, userID string) error {
	in, p := c.newIO()
	if err := in.GetLatestResult(ctx.Request().Context(), userID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.Result())
}

func (c *CareerInterestController) GetResultBySessionID(ctx echo.Context, sessionID string) error {
	in, p := c.newIO()
	if err := in.GetResultBySessionID(ctx.Request().Context(), sessionID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.Result())
}

func (c *CareerInterestController) newIO() (port.CareerInterestInputPort, *presenter.CareerInterestPresenter) {
	output := c.outputFactory()
	input := c.inputFactory(
		c.sessionRepoFactory(), c.resultRepoFactory(),
		c.basicScoreRepoFactory(), c.typeScoreRepoFactory(), output,
	)
	return input, output
}
