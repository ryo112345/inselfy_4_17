package controller

import (
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"

	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/domain/post"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type PostController struct {
	inputFactory  func(repo port.PostRepository, output port.PostOutputPort) port.PostInputPort
	outputFactory func() *presenter.PostPresenter
	repoFactory   func() port.PostRepository
}

func NewPostController(
	inputFactory func(repo port.PostRepository, output port.PostOutputPort) port.PostInputPort,
	outputFactory func() *presenter.PostPresenter,
	repoFactory func() port.PostRepository,
) *PostController {
	return &PostController{
		inputFactory:  inputFactory,
		outputFactory: outputFactory,
		repoFactory:   repoFactory,
	}
}

type createPostRequest struct {
	Content string `json:"content"`
}

func (c *PostController) Create(ctx echo.Context) error {
	userID, ok := ctx.Get(authmw.UserIDKey).(string)
	if !ok || userID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	var body createPostRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid body")
	}
	input, p := c.newIO()
	if err := input.Create(ctx.Request().Context(), post.CreatePostInput{
		UserID:  userID,
		Content: body.Content,
	}); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, p.SingleResponse())
}

func (c *PostController) ListTimeline(ctx echo.Context) error {
	limit, _ := strconv.Atoi(ctx.QueryParam("limit"))
	offset, _ := strconv.Atoi(ctx.QueryParam("offset"))
	input, p := c.newIO()
	if err := input.ListTimeline(ctx.Request().Context(), limit, offset); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.ListResponse())
}

func (c *PostController) ListByUserID(ctx echo.Context, userID string) error {
	limit, _ := strconv.Atoi(ctx.QueryParam("limit"))
	offset, _ := strconv.Atoi(ctx.QueryParam("offset"))
	input, p := c.newIO()
	if err := input.ListByUserID(ctx.Request().Context(), userID, limit, offset); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.ListResponse())
}

func (c *PostController) Delete(ctx echo.Context, postID string) error {
	userID, ok := ctx.Get(authmw.UserIDKey).(string)
	if !ok || userID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	input, _ := c.newIO()
	if err := input.Delete(ctx.Request().Context(), postID, userID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.NoContent(http.StatusNoContent)
}

func (c *PostController) newIO() (port.PostInputPort, *presenter.PostPresenter) {
	output := c.outputFactory()
	input := c.inputFactory(c.repoFactory(), output)
	return input, output
}
