package controller

import (
	"context"
	"net/http"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/domain/education"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// EducationController handles education HTTP endpoints.
type EducationController struct {
	input port.EducationInputPort
}

// NewEducationController creates an EducationController.
func NewEducationController(
	input port.EducationInputPort,
) *EducationController {
	return &EducationController{input: input}
}

// List handles GET /api/users/{username}/educations.
func (c *EducationController) List(ctx context.Context, req openapi.EducationsListEducationsRequestObject) (openapi.EducationsListEducationsResponseObject, error) {
	es, err := c.input.List(ctx, req.Username)
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.EducationsListEducations404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.EducationsListEducations400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.EducationsListEducations200JSONResponse(presenter.EducationsResponse(es)), nil
}

// Create handles POST /api/users/{username}/educations.
func (c *EducationController) Create(ctx context.Context, req openapi.EducationsCreateEducationRequestObject) (openapi.EducationsCreateEducationResponseObject, error) {
	e, err := c.input.Create(ctx, authmw.UserIDFromContext(ctx), req.Username, toCreateEducationInput(*req.Body))
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.EducationsCreateEducation404JSONResponse(notFoundBody(err)), nil
		case http.StatusForbidden:
			return openapi.EducationsCreateEducation403JSONResponse(forbiddenBody(err)), nil
		case http.StatusConflict:
			return openapi.EducationsCreateEducation409JSONResponse(conflictBody(err)), nil
		case http.StatusBadRequest:
			return openapi.EducationsCreateEducation400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.EducationsCreateEducation201JSONResponse(presenter.EducationResponse(e)), nil
}

// Update handles PUT /api/users/{username}/educations/{educationId}.
func (c *EducationController) Update(ctx context.Context, req openapi.EducationsUpdateEducationRequestObject) (openapi.EducationsUpdateEducationResponseObject, error) {
	e, err := c.input.Update(ctx, authmw.UserIDFromContext(ctx), req.Username, req.EducationId, toUpdateEducationInput(*req.Body))
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.EducationsUpdateEducation404JSONResponse(notFoundBody(err)), nil
		case http.StatusForbidden:
			return openapi.EducationsUpdateEducation403JSONResponse(forbiddenBody(err)), nil
		case http.StatusBadRequest:
			return openapi.EducationsUpdateEducation400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.EducationsUpdateEducation200JSONResponse(presenter.EducationResponse(e)), nil
}

// Delete handles DELETE /api/users/{username}/educations/{educationId}.
func (c *EducationController) Delete(ctx context.Context, req openapi.EducationsDeleteEducationRequestObject) (openapi.EducationsDeleteEducationResponseObject, error) {
	if err := c.input.Delete(ctx, authmw.UserIDFromContext(ctx), req.Username, req.EducationId); err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.EducationsDeleteEducation404JSONResponse(notFoundBody(err)), nil
		case http.StatusForbidden:
			return openapi.EducationsDeleteEducation403JSONResponse(forbiddenBody(err)), nil
		case http.StatusBadRequest:
			return openapi.EducationsDeleteEducation400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.EducationsDeleteEducation204Response{}, nil
}

func toCreateEducationInput(body openapi.ModelsCreateEducationRequest) education.CreateInput {
	return education.CreateInput{
		School:    body.School,
		Degree:    body.Degree,
		StartYear: int32PtrToInt16Ptr(body.StartYear),
		EndYear:   int32PtrToInt16Ptr(body.EndYear),
	}
}

func toUpdateEducationInput(body openapi.ModelsUpdateEducationRequest) education.UpdateInput {
	return education.UpdateInput{
		School:    body.School,
		Degree:    body.Degree,
		StartYear: int32PtrToInt16Ptr(body.StartYear),
		EndYear:   int32PtrToInt16Ptr(body.EndYear),
	}
}
