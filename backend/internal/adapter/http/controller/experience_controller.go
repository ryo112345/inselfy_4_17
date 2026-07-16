package controller

import (
	"context"
	"net/http"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/domain/experience"
	"github.com/akiyama/inselfy/backend/internal/pkg/cast"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// ExperienceController handles experience HTTP endpoints.
type ExperienceController struct {
	input port.ExperienceInputPort
}

// NewExperienceController creates an ExperienceController.
func NewExperienceController(
	input port.ExperienceInputPort,
) *ExperienceController {
	return &ExperienceController{input: input}
}

// List handles GET /api/users/{username}/experiences.
func (c *ExperienceController) List(ctx context.Context, req openapi.ExperiencesListExperiencesRequestObject) (openapi.ExperiencesListExperiencesResponseObject, error) {
	list, err := c.input.List(ctx, req.Username)
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.ExperiencesListExperiences404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.ExperiencesListExperiences400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.ExperiencesListExperiences200JSONResponse(presenter.ExperiencesResponse(list)), nil
}

// Create handles POST /api/users/{username}/experiences.
func (c *ExperienceController) Create(ctx context.Context, req openapi.ExperiencesCreateExperienceRequestObject) (openapi.ExperiencesCreateExperienceResponseObject, error) {
	e, err := c.input.Create(ctx, authmw.UserIDFromContext(ctx), req.Username, toCreateExperienceInput(*req.Body))
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.ExperiencesCreateExperience404JSONResponse(notFoundBody(err)), nil
		case http.StatusForbidden:
			return openapi.ExperiencesCreateExperience403JSONResponse(forbiddenBody(err)), nil
		case http.StatusConflict:
			return openapi.ExperiencesCreateExperience409JSONResponse(conflictBody(err)), nil
		case http.StatusBadRequest:
			return openapi.ExperiencesCreateExperience400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.ExperiencesCreateExperience201JSONResponse(presenter.ExperienceResponse(e)), nil
}

// Update handles PUT /api/users/{username}/experiences/{experienceId}.
func (c *ExperienceController) Update(ctx context.Context, req openapi.ExperiencesUpdateExperienceRequestObject) (openapi.ExperiencesUpdateExperienceResponseObject, error) {
	e, err := c.input.Update(ctx, authmw.UserIDFromContext(ctx), req.Username, req.ExperienceId, toUpdateExperienceInput(*req.Body))
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.ExperiencesUpdateExperience404JSONResponse(notFoundBody(err)), nil
		case http.StatusForbidden:
			return openapi.ExperiencesUpdateExperience403JSONResponse(forbiddenBody(err)), nil
		case http.StatusBadRequest:
			return openapi.ExperiencesUpdateExperience400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.ExperiencesUpdateExperience200JSONResponse(presenter.ExperienceResponse(e)), nil
}

// Delete handles DELETE /api/users/{username}/experiences/{experienceId}.
func (c *ExperienceController) Delete(ctx context.Context, req openapi.ExperiencesDeleteExperienceRequestObject) (openapi.ExperiencesDeleteExperienceResponseObject, error) {
	if err := c.input.Delete(ctx, authmw.UserIDFromContext(ctx), req.Username, req.ExperienceId); err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.ExperiencesDeleteExperience404JSONResponse(notFoundBody(err)), nil
		case http.StatusForbidden:
			return openapi.ExperiencesDeleteExperience403JSONResponse(forbiddenBody(err)), nil
		case http.StatusBadRequest:
			return openapi.ExperiencesDeleteExperience400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.ExperiencesDeleteExperience204Response{}, nil
}

func toCreateExperienceInput(body openapi.ModelsCreateExperienceRequest) experience.CreateInput {
	return experience.CreateInput{
		CompanyName: body.CompanyName,
		Title:       body.Title,
		StartYear:   cast.Int16From32(body.StartYear),
		StartMonth:  cast.Int16From32(body.StartMonth),
		EndYear:     int32PtrToInt16Ptr(body.EndYear),
		EndMonth:    int32PtrToInt16Ptr(body.EndMonth),
		IsCurrent:   body.IsCurrent,
		Description: derefString(body.Description),
	}
}

func toUpdateExperienceInput(body openapi.ModelsUpdateExperienceRequest) experience.UpdateInput {
	return experience.UpdateInput{
		CompanyName: body.CompanyName,
		Title:       body.Title,
		StartYear:   cast.Int16From32(body.StartYear),
		StartMonth:  cast.Int16From32(body.StartMonth),
		EndYear:     int32PtrToInt16Ptr(body.EndYear),
		EndMonth:    int32PtrToInt16Ptr(body.EndMonth),
		IsCurrent:   body.IsCurrent,
		Description: derefString(body.Description),
	}
}

// 範囲外の値は cast で clamp され、その後の domain バリデーション
// （年・月の範囲チェック）で弾かれる。
func int32PtrToInt16Ptr(v *int32) *int16 {
	if v == nil {
		return nil
	}
	n := cast.Int16From32(*v)
	return &n
}

func derefString(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
