package controller

import (
	"errors"
	"fmt"
	"net/http"

	"github.com/labstack/echo/v4"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/domain/education"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/experience"
	"github.com/akiyama/inselfy/backend/internal/domain/skill"
	"github.com/akiyama/inselfy/backend/internal/domain/user"
	"github.com/akiyama/inselfy/backend/internal/port"
)

func handleError(ctx echo.Context, err error) error {
	switch {
	case errors.Is(err, domainerr.ErrNotFound):
		return ctx.JSON(http.StatusNotFound, openapi.ModelsNotFoundError{
			Code:    openapi.ModelsNotFoundErrorCodeNOTFOUND,
			Message: err.Error(),
		})
	case errors.Is(err, domainerr.ErrConflict),
		errors.Is(err, experience.ErrTooManyEntries),
		errors.Is(err, education.ErrTooManyEntries),
		errors.Is(err, skill.ErrTooManyEntries):
		return ctx.JSON(http.StatusConflict, openapi.ModelsConflictError{
			Code:    openapi.ModelsConflictErrorCodeCONFLICT,
			Message: err.Error(),
		})
	case errors.Is(err, port.ErrForbidden):
		return ctx.JSON(http.StatusForbidden, openapi.ModelsForbiddenError{
			Code:    openapi.ModelsForbiddenErrorCodeFORBIDDEN,
			Message: err.Error(),
		})
	case isBadRequest(err):
		return ctx.JSON(http.StatusBadRequest, openapi.ModelsBadRequestError{
			Code:    openapi.ModelsBadRequestErrorCodeBADREQUEST,
			Message: err.Error(),
		})
	default:
		return ctx.JSON(http.StatusInternalServerError, openapi.ModelsErrorResponse{
			Code:    "INTERNAL",
			Message: err.Error(),
		})
	}
}

func isBadRequest(err error) bool {
	switch {
	case errors.Is(err, domainerr.ErrBadRequest):
		return true
	case errors.Is(err, user.ErrInvalidUsername),
		errors.Is(err, user.ErrNameRequired),
		errors.Is(err, user.ErrNameTooLong),
		errors.Is(err, user.ErrDisplayNameTooLong),
		errors.Is(err, user.ErrHeadlineTooLong),
		errors.Is(err, user.ErrLocationTooLong),
		errors.Is(err, user.ErrAboutTooLong),
		errors.Is(err, user.ErrIndustryTooLong),
		errors.Is(err, user.ErrJobTypeTooLong),
		errors.Is(err, user.ErrJobSeekingStatusTooLong),
		errors.Is(err, user.ErrInvalidProfileColor):
		return true
	case errors.Is(err, experience.ErrCompanyNameRequired),
		errors.Is(err, experience.ErrCompanyNameTooLong),
		errors.Is(err, experience.ErrTitleRequired),
		errors.Is(err, experience.ErrTitleTooLong),
		errors.Is(err, experience.ErrDescriptionTooLong),
		errors.Is(err, experience.ErrStartYearOutOfRange),
		errors.Is(err, experience.ErrStartMonthOutOfRange),
		errors.Is(err, experience.ErrEndYearOutOfRange),
		errors.Is(err, experience.ErrEndMonthOutOfRange),
		errors.Is(err, experience.ErrCurrentHasEnd),
		errors.Is(err, experience.ErrEndedMissingEnd),
		errors.Is(err, experience.ErrEndBeforeStart):
		return true
	case errors.Is(err, education.ErrSchoolRequired),
		errors.Is(err, education.ErrSchoolTooLong),
		errors.Is(err, education.ErrDegreeTooLong),
		errors.Is(err, education.ErrYearOutOfRange),
		errors.Is(err, education.ErrEndBeforeStart):
		return true
	case errors.Is(err, skill.ErrNameRequired),
		errors.Is(err, skill.ErrNameTooLong):
		return true
	}
	return false
}

func badRequest(ctx echo.Context, message string) error {
	return ctx.JSON(http.StatusBadRequest, openapi.ModelsBadRequestError{
		Code:    openapi.ModelsBadRequestErrorCodeBADREQUEST,
		Message: message,
	})
}

// invalidField builds a domain-level bad-request error tagged with the field
// name, so `handleError` maps it to 400 and the client sees which field is wrong.
func invalidField(name string) error {
	return fmt.Errorf("%w: invalid field %q", domainerr.ErrBadRequest, name)
}
