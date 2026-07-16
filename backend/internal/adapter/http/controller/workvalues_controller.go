package controller

import (
	"context"
	"net/http"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
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

// StartSession handles POST /api/work-values/sessions.
func (c *WorkValuesController) StartSession(ctx context.Context, _ openapi.WorkValuesWvStartSessionRequestObject) (openapi.WorkValuesWvStartSessionResponseObject, error) {
	s, err := c.input.StartSession(ctx, authmw.UserIDFromContext(ctx))
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.WorkValuesWvStartSession404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.WorkValuesWvStartSession400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.WorkValuesWvStartSession201JSONResponse(presenter.WorkValuesSessionResponse(s)), nil
}

// SubmitResult handles POST /api/work-values/sessions/{sessionId}/results.
func (c *WorkValuesController) SubmitResult(ctx context.Context, req openapi.WorkValuesWvSubmitResultRequestObject) (openapi.WorkValuesWvSubmitResultResponseObject, error) {
	r, err := c.input.SubmitResult(ctx, req.SessionId, authmw.UserIDFromContext(ctx), wvSubmitInputFromBody(*req.Body))
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.WorkValuesWvSubmitResult404JSONResponse(notFoundBody(err)), nil
		case http.StatusForbidden:
			return openapi.WorkValuesWvSubmitResult403JSONResponse(forbiddenBody(err)), nil
		case http.StatusBadRequest:
			return openapi.WorkValuesWvSubmitResult400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.WorkValuesWvSubmitResult201JSONResponse(presenter.WorkValuesResultResponse(r)), nil
}

func wvSubmitInputFromBody(body openapi.ModelsWVSubmitResultRequest) workvalues.SubmitInput {
	responses := make([]workvalues.Response, len(body.Responses))
	for i, r := range body.Responses {
		responses[i] = workvalues.Response{
			NeedA:          r.NeedA,
			NeedB:          r.NeedB,
			Winner:         r.Winner,
			QuestionNumber: int(r.QuestionNumber),
		}
	}
	return workvalues.SubmitInput{
		Responses: responses,
		Mu:        body.Mu,
		SE:        body.Se,
	}
}

// GetLatestResult handles GET /api/work-values/users/{userId}/results/latest.
func (c *WorkValuesController) GetLatestResult(ctx context.Context, req openapi.WorkValuesWvGetLatestResultRequestObject) (openapi.WorkValuesWvGetLatestResultResponseObject, error) {
	r, err := c.input.GetLatestResult(ctx, req.UserId)
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.WorkValuesWvGetLatestResult404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.WorkValuesWvGetLatestResult400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.WorkValuesWvGetLatestResult200JSONResponse(presenter.WorkValuesResultResponse(r)), nil
}

// GetResultBySessionID handles GET /api/work-values/sessions/{sessionId}/results.
func (c *WorkValuesController) GetResultBySessionID(ctx context.Context, req openapi.WorkValuesWvGetResultBySessionRequestObject) (openapi.WorkValuesWvGetResultBySessionResponseObject, error) {
	r, err := c.input.GetResultBySessionID(ctx, req.SessionId)
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.WorkValuesWvGetResultBySession404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.WorkValuesWvGetResultBySession400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.WorkValuesWvGetResultBySession200JSONResponse(presenter.WorkValuesResultResponse(r)), nil
}

// RequestAiReport handles POST /api/work-values/sessions/{sessionId}/ai-report/request.
func (c *WorkValuesController) RequestAiReport(ctx context.Context, req openapi.WorkValuesWvRequestAiReportRequestObject) (openapi.WorkValuesWvRequestAiReportResponseObject, error) {
	if err := c.input.RequestAiReport(ctx, req.SessionId, authmw.UserIDFromContext(ctx)); err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.WorkValuesWvRequestAiReport404JSONResponse(notFoundBody(err)), nil
		case http.StatusForbidden:
			return openapi.WorkValuesWvRequestAiReport403JSONResponse(forbiddenBody(err)), nil
		case http.StatusBadRequest:
			return openapi.WorkValuesWvRequestAiReport400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.WorkValuesWvRequestAiReport204Response{}, nil
}
