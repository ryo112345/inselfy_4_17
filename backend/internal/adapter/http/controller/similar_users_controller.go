package controller

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"

	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type SimilarUsersController struct {
	input port.SimilarUsersInputPort
}

func NewSimilarUsersController(input port.SimilarUsersInputPort) *SimilarUsersController {
	return &SimilarUsersController{input: input}
}

func (c *SimilarUsersController) GetSimilarUsers(ctx echo.Context, userID string) error {
	limit, _ := strconv.Atoi(ctx.QueryParam("limit"))
	if limit < 1 || limit > 50 {
		limit = 10
	}

	users, err := c.input.GetSimilarUsers(ctx.Request().Context(), userID, limit)
	if err != nil {
		if errors.Is(err, domainerr.ErrNotFound) {
			return notFoundError(ctx, "user has no work values result")
		}
		return internalError(ctx, err.Error())
	}

	return ctx.JSON(http.StatusOK, presenter.SimilarUsersResponse(users))
}
