package controller

import (
	"context"
	"errors"
	"net/http"

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

// invalidLinkBody is the 404 body for an unknown invite token (歴史的メッセージを維持).
func invalidLinkBody() openapi.ModelsNotFoundError {
	return openapi.ModelsNotFoundError{
		Code:    openapi.ModelsNotFoundErrorCodeNOTFOUND,
		Message: "無効なリンクです",
	}
}

// GetByToken handles GET /api/team-diagnose/{token}.
func (c *TeamDiagnoseController) GetByToken(ctx context.Context, req openapi.TeamDiagnoseGetDiagnoseByTokenRequestObject) (openapi.TeamDiagnoseGetDiagnoseByTokenResponseObject, error) {
	info, err := c.input.GetByToken(ctx, req.Token)
	if err != nil {
		if errors.Is(err, domainerr.ErrNotFound) {
			return openapi.TeamDiagnoseGetDiagnoseByToken404JSONResponse(invalidLinkBody()), nil
		}
		return nil, err
	}
	return openapi.TeamDiagnoseGetDiagnoseByToken200JSONResponse(presenter.DiagnoseInfoResponse(info)), nil
}

// resolveMemberUserID validates the invite token and returns the member's user ID.
// The token itself is the authorization: only invitees who received the link can act
// as the member it points to.
func (c *TeamDiagnoseController) resolveMemberUserID(ctx context.Context, token string) (string, error) {
	info, err := c.input.GetByToken(ctx, token)
	if err != nil {
		return "", err
	}
	return info.UserID, nil
}

// StartWVSession handles POST /api/team-diagnose/{token}/work-values/sessions.
func (c *TeamDiagnoseController) StartWVSession(ctx context.Context, req openapi.TeamDiagnoseStartDiagnoseWvSessionRequestObject) (openapi.TeamDiagnoseStartDiagnoseWvSessionResponseObject, error) {
	userID, err := c.resolveMemberUserID(ctx, req.Token)
	if err != nil {
		if errors.Is(err, domainerr.ErrNotFound) {
			return openapi.TeamDiagnoseStartDiagnoseWvSession404JSONResponse(invalidLinkBody()), nil
		}
		return nil, err
	}

	s, err := c.wvInput.StartSession(ctx, userID)
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.TeamDiagnoseStartDiagnoseWvSession404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.TeamDiagnoseStartDiagnoseWvSession400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.TeamDiagnoseStartDiagnoseWvSession201JSONResponse(presenter.WorkValuesSessionResponse(s)), nil
}

// SubmitWVResult handles POST /api/team-diagnose/{token}/work-values/sessions/{sessionId}/results.
func (c *TeamDiagnoseController) SubmitWVResult(ctx context.Context, req openapi.TeamDiagnoseSubmitDiagnoseWvResultRequestObject) (openapi.TeamDiagnoseSubmitDiagnoseWvResultResponseObject, error) {
	userID, err := c.resolveMemberUserID(ctx, req.Token)
	if err != nil {
		if errors.Is(err, domainerr.ErrNotFound) {
			return openapi.TeamDiagnoseSubmitDiagnoseWvResult404JSONResponse(invalidLinkBody()), nil
		}
		return nil, err
	}

	r, err := c.wvInput.SubmitResult(ctx, req.SessionId, userID, wvSubmitInputFromBody(*req.Body))
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.TeamDiagnoseSubmitDiagnoseWvResult404JSONResponse(notFoundBody(err)), nil
		case http.StatusForbidden:
			return openapi.TeamDiagnoseSubmitDiagnoseWvResult403JSONResponse(forbiddenBody(err)), nil
		case http.StatusBadRequest:
			return openapi.TeamDiagnoseSubmitDiagnoseWvResult400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.TeamDiagnoseSubmitDiagnoseWvResult201JSONResponse(presenter.WorkValuesResultResponse(r)), nil
}

// StartCISession handles POST /api/team-diagnose/{token}/career-interest/sessions.
func (c *TeamDiagnoseController) StartCISession(ctx context.Context, req openapi.TeamDiagnoseStartDiagnoseCiSessionRequestObject) (openapi.TeamDiagnoseStartDiagnoseCiSessionResponseObject, error) {
	userID, err := c.resolveMemberUserID(ctx, req.Token)
	if err != nil {
		if errors.Is(err, domainerr.ErrNotFound) {
			return openapi.TeamDiagnoseStartDiagnoseCiSession404JSONResponse(invalidLinkBody()), nil
		}
		return nil, err
	}

	s, err := c.ciInput.StartSession(ctx, userID)
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.TeamDiagnoseStartDiagnoseCiSession404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.TeamDiagnoseStartDiagnoseCiSession400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.TeamDiagnoseStartDiagnoseCiSession201JSONResponse(presenter.CareerInterestSessionResponse(s)), nil
}

// SubmitCIResult handles POST /api/team-diagnose/{token}/career-interest/sessions/{sessionId}/results.
func (c *TeamDiagnoseController) SubmitCIResult(ctx context.Context, req openapi.TeamDiagnoseSubmitDiagnoseCiResultRequestObject) (openapi.TeamDiagnoseSubmitDiagnoseCiResultResponseObject, error) {
	userID, err := c.resolveMemberUserID(ctx, req.Token)
	if err != nil {
		if errors.Is(err, domainerr.ErrNotFound) {
			return openapi.TeamDiagnoseSubmitDiagnoseCiResult404JSONResponse(invalidLinkBody()), nil
		}
		return nil, err
	}

	r, err := c.ciInput.SubmitResult(ctx, req.SessionId, userID, ciSubmitInputFromBody(*req.Body))
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.TeamDiagnoseSubmitDiagnoseCiResult404JSONResponse(notFoundBody(err)), nil
		case http.StatusForbidden:
			return openapi.TeamDiagnoseSubmitDiagnoseCiResult403JSONResponse(forbiddenBody(err)), nil
		case http.StatusBadRequest:
			return openapi.TeamDiagnoseSubmitDiagnoseCiResult400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.TeamDiagnoseSubmitDiagnoseCiResult201JSONResponse(presenter.CareerInterestResultResponse(r)), nil
}

// UpdateStatus handles PUT /api/team-diagnose/{token}/status.
func (c *TeamDiagnoseController) UpdateStatus(ctx context.Context, req openapi.TeamDiagnoseUpdateDiagnoseStatusRequestObject) (openapi.TeamDiagnoseUpdateDiagnoseStatusResponseObject, error) {
	if err := c.input.UpdateStatus(ctx, req.Token, (*string)(req.Body.WvStatus), (*string)(req.Body.CiStatus)); err != nil {
		switch {
		case errors.Is(err, domainerr.ErrBadRequest):
			return openapi.TeamDiagnoseUpdateDiagnoseStatus400JSONResponse(badRequestBody(err.Error())), nil
		case errors.Is(err, domainerr.ErrNotFound):
			return openapi.TeamDiagnoseUpdateDiagnoseStatus404JSONResponse(openapi.ModelsNotFoundError{
				Code:    openapi.ModelsNotFoundErrorCodeNOTFOUND,
				Message: "member not found",
			}), nil
		default:
			return nil, err
		}
	}
	return openapi.TeamDiagnoseUpdateDiagnoseStatus204Response{}, nil
}
