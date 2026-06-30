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
	inputFactory    func(repo port.FollowRepository, userRepo port.UserRepository, output port.FollowOutputPort) port.FollowInputPort
	outputFactory   func() *presenter.FollowPresenter
	repoFactory     func() port.FollowRepository
	userRepoFactory func() port.UserRepository
}

func NewFollowController(
	inputFactory func(repo port.FollowRepository, userRepo port.UserRepository, output port.FollowOutputPort) port.FollowInputPort,
	outputFactory func() *presenter.FollowPresenter,
	repoFactory func() port.FollowRepository,
	userRepoFactory func() port.UserRepository,
) *FollowController {
	return &FollowController{
		inputFactory:    inputFactory,
		outputFactory:   outputFactory,
		repoFactory:     repoFactory,
		userRepoFactory: userRepoFactory,
	}
}

func (c *FollowController) Follow(ctx echo.Context, username string) error {
	userID := authmw.UserID(ctx)
	input, _ := c.newIO()
	if err := input.Follow(ctx.Request().Context(), userID, username); err != nil {
		return handleError(ctx, err)
	}
	return ctx.NoContent(http.StatusNoContent)
}

func (c *FollowController) Unfollow(ctx echo.Context, username string) error {
	userID := authmw.UserID(ctx)
	input, _ := c.newIO()
	if err := input.Unfollow(ctx.Request().Context(), userID, username); err != nil {
		return handleError(ctx, err)
	}
	return ctx.NoContent(http.StatusNoContent)
}

func (c *FollowController) GetFollowers(ctx echo.Context, username string) error {
	limit, _ := strconv.Atoi(ctx.QueryParam("limit"))
	offset, _ := strconv.Atoi(ctx.QueryParam("offset"))
	input, p := c.newIO()
	if err := input.GetFollowers(ctx.Request().Context(), username, limit, offset); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.ListResponse())
}

func (c *FollowController) GetFollowing(ctx echo.Context, username string) error {
	limit, _ := strconv.Atoi(ctx.QueryParam("limit"))
	offset, _ := strconv.Atoi(ctx.QueryParam("offset"))
	input, p := c.newIO()
	if err := input.GetFollowing(ctx.Request().Context(), username, limit, offset); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.ListResponse())
}

func (c *FollowController) GetFollowStatus(ctx echo.Context, username string) error {
	userID := authmw.UserID(ctx)
	input, p := c.newIO()
	if err := input.GetFollowStatus(ctx.Request().Context(), userID, username); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.StatusResponse())
}

func (c *FollowController) newIO() (port.FollowInputPort, *presenter.FollowPresenter) {
	output := c.outputFactory()
	input := c.inputFactory(c.repoFactory(), c.userRepoFactory(), output)
	return input, output
}
