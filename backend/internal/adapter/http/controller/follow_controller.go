package controller

import (
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"

	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type FollowController struct {
	input port.FollowInputPort
}

func NewFollowController(
	input port.FollowInputPort,
) *FollowController {
	return &FollowController{input: input}
}

func (c *FollowController) Follow(ctx echo.Context, username string) error {
	userID := authmw.UserID(ctx)
	if err := c.input.Follow(ctx.Request().Context(), userID, username); err != nil {
		return handleError(ctx, err)
	}
	return ctx.NoContent(http.StatusNoContent)
}

func (c *FollowController) Unfollow(ctx echo.Context, username string) error {
	userID := authmw.UserID(ctx)
	if err := c.input.Unfollow(ctx.Request().Context(), userID, username); err != nil {
		return handleError(ctx, err)
	}
	return ctx.NoContent(http.StatusNoContent)
}

func (c *FollowController) GetFollowers(ctx echo.Context, username string) error {
	limit, _ := strconv.Atoi(ctx.QueryParam("limit"))
	offset, _ := strconv.Atoi(ctx.QueryParam("offset"))
	users, total, err := c.input.GetFollowers(ctx.Request().Context(), username, limit, offset)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.FollowUsersResponse(users, total))
}

func (c *FollowController) GetFollowing(ctx echo.Context, username string) error {
	limit, _ := strconv.Atoi(ctx.QueryParam("limit"))
	offset, _ := strconv.Atoi(ctx.QueryParam("offset"))
	users, total, err := c.input.GetFollowing(ctx.Request().Context(), username, limit, offset)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.FollowUsersResponse(users, total))
}

func (c *FollowController) GetFollowStatus(ctx echo.Context, username string) error {
	userID := authmw.UserID(ctx)
	status, err := c.input.GetFollowStatus(ctx.Request().Context(), userID, username)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.FollowStatusResponse(status))
}
