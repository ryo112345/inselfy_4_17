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
	Content     string `json:"content"`
	QuotePostID string `json:"quotePostId,omitempty"`
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
		UserID:      userID,
		Content:     body.Content,
		QuotePostID: body.QuotePostID,
	}); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, p.SingleResponse())
}

func (c *PostController) GetByID(ctx echo.Context, postID string) error {
	viewerID := ctx.QueryParam("viewerId")
	input, p := c.newIO()
	if err := input.GetByID(ctx.Request().Context(), postID, viewerID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.SingleResponse())
}

func (c *PostController) ListTimeline(ctx echo.Context) error {
	limit, _ := strconv.Atoi(ctx.QueryParam("limit"))
	offset, _ := strconv.Atoi(ctx.QueryParam("offset"))
	viewerID := ctx.QueryParam("viewerId")
	input, p := c.newIO()
	if err := input.ListTimeline(ctx.Request().Context(), limit, offset, viewerID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.ListResponse())
}

func (c *PostController) ListByUserID(ctx echo.Context, userID string) error {
	limit, _ := strconv.Atoi(ctx.QueryParam("limit"))
	offset, _ := strconv.Atoi(ctx.QueryParam("offset"))
	viewerID := ctx.QueryParam("viewerId")
	input, p := c.newIO()
	if err := input.ListByUserID(ctx.Request().Context(), userID, limit, offset, viewerID); err != nil {
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

func (c *PostController) ToggleLike(ctx echo.Context, postID string) error {
	userID, ok := ctx.Get(authmw.UserIDKey).(string)
	if !ok || userID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	input, p := c.newIO()
	if err := input.ToggleLike(ctx.Request().Context(), postID, userID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.LikeToggleResponse())
}

func (c *PostController) ListLikedByUserID(ctx echo.Context, userID string) error {
	limit, _ := strconv.Atoi(ctx.QueryParam("limit"))
	offset, _ := strconv.Atoi(ctx.QueryParam("offset"))
	input, p := c.newIO()
	if err := input.ListLikedByUserID(ctx.Request().Context(), userID, limit, offset); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.ListResponse())
}

func (c *PostController) ToggleRepost(ctx echo.Context, postID string) error {
	userID, ok := ctx.Get(authmw.UserIDKey).(string)
	if !ok || userID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	input, p := c.newIO()
	if err := input.ToggleRepost(ctx.Request().Context(), postID, userID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.RepostToggleResponse())
}

type createCommentRequest struct {
	Content string `json:"content"`
}

func (c *PostController) CreateComment(ctx echo.Context, postID string) error {
	userID, ok := ctx.Get(authmw.UserIDKey).(string)
	if !ok || userID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	var body createCommentRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid body")
	}
	input, p := c.newIO()
	if err := input.CreateComment(ctx.Request().Context(), post.CreateCommentInput{
		PostID:  postID,
		UserID:  userID,
		Content: body.Content,
	}); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, p.CommentResponse())
}

func (c *PostController) ListComments(ctx echo.Context, postID string) error {
	limit, _ := strconv.Atoi(ctx.QueryParam("limit"))
	offset, _ := strconv.Atoi(ctx.QueryParam("offset"))
	input, p := c.newIO()
	if err := input.ListComments(ctx.Request().Context(), postID, limit, offset); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.CommentListResponse())
}

func (c *PostController) DeleteComment(ctx echo.Context, commentID string) error {
	userID, ok := ctx.Get(authmw.UserIDKey).(string)
	if !ok || userID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	input, _ := c.newIO()
	if err := input.DeleteComment(ctx.Request().Context(), commentID, userID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.NoContent(http.StatusNoContent)
}

func (c *PostController) newIO() (port.PostInputPort, *presenter.PostPresenter) {
	output := c.outputFactory()
	input := c.inputFactory(c.repoFactory(), output)
	return input, output
}
