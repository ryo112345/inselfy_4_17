package controller

import (
	"errors"
	"net/http"

	"github.com/labstack/echo/v4"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/user"
)

func handleError(ctx echo.Context, err error) error {
	switch {
	case errors.Is(err, domainerr.ErrNotFound):
		return ctx.JSON(http.StatusNotFound, openapi.ModelsNotFoundError{
			Code:    openapi.ModelsNotFoundErrorCodeNOTFOUND,
			Message: err.Error(),
		})
	case errors.Is(err, domainerr.ErrConflict):
		return ctx.JSON(http.StatusConflict, openapi.ModelsConflictError{
			Code:    openapi.ModelsConflictErrorCodeCONFLICT,
			Message: "username already taken",
		})
	case errors.Is(err, user.ErrInvalidUsername),
		errors.Is(err, user.ErrNameRequired),
		errors.Is(err, user.ErrNameTooLong),
		errors.Is(err, domainerr.ErrBadRequest):
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
