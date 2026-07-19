package controller

import (
	"context"
	"net/http"

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

// StartSession handles POST /api/career-interest/sessions.
func (c *CareerInterestController) StartSession(ctx context.Context, _ openapi.CareerInterestCiStartSessionRequestObject) (openapi.CareerInterestCiStartSessionResponseObject, error) {
	s, err := c.input.StartSession(ctx, authmw.UserIDFromContext(ctx))
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.CareerInterestCiStartSession404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CareerInterestCiStartSession400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.CareerInterestCiStartSession201JSONResponse(presenter.CareerInterestSessionResponse(s)), nil
}

// SubmitResult handles POST /api/career-interest/sessions/{sessionId}/results.
func (c *CareerInterestController) SubmitResult(ctx context.Context, req openapi.CareerInterestCiSubmitResultRequestObject) (openapi.CareerInterestCiSubmitResultResponseObject, error) {
	r, err := c.input.SubmitResult(ctx, req.SessionId, authmw.UserIDFromContext(ctx), ciSubmitInputFromBody(*req.Body))
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.CareerInterestCiSubmitResult404JSONResponse(notFoundBody(err)), nil
		case http.StatusForbidden:
			return openapi.CareerInterestCiSubmitResult403JSONResponse(forbiddenBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CareerInterestCiSubmitResult400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.CareerInterestCiSubmitResult201JSONResponse(presenter.CareerInterestResultResponse(r)), nil
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

// GetLatestResult handles GET /api/career-interest/users/{userId}/results/latest.
func (c *CareerInterestController) GetLatestResult(ctx context.Context, req openapi.CareerInterestCiGetLatestResultRequestObject) (openapi.CareerInterestCiGetLatestResultResponseObject, error) {
	r, err := c.input.GetLatestResult(ctx, req.UserId)
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.CareerInterestCiGetLatestResult404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CareerInterestCiGetLatestResult400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.CareerInterestCiGetLatestResult200JSONResponse(presenter.CareerInterestResultResponse(r)), nil
}

// GetResultBySessionID handles GET /api/career-interest/sessions/{sessionId}/results.
func (c *CareerInterestController) GetResultBySessionID(ctx context.Context, req openapi.CareerInterestCiGetResultBySessionRequestObject) (openapi.CareerInterestCiGetResultBySessionResponseObject, error) {
	r, err := c.input.GetResultBySessionID(ctx, req.SessionId)
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.CareerInterestCiGetResultBySession404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CareerInterestCiGetResultBySession400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.CareerInterestCiGetResultBySession200JSONResponse(presenter.CareerInterestResultResponse(r)), nil
}

// RequestAiReport handles POST /api/career-interest/sessions/{sessionId}/ai-report/request.
func (c *CareerInterestController) RequestAiReport(ctx context.Context, req openapi.CareerInterestCiRequestAiReportRequestObject) (openapi.CareerInterestCiRequestAiReportResponseObject, error) {
	if err := c.input.RequestAiReport(ctx, req.SessionId, authmw.UserIDFromContext(ctx)); err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.CareerInterestCiRequestAiReport404JSONResponse(notFoundBody(err)), nil
		case http.StatusForbidden:
			return openapi.CareerInterestCiRequestAiReport403JSONResponse(forbiddenBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CareerInterestCiRequestAiReport400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.CareerInterestCiRequestAiReport204Response{}, nil
}
