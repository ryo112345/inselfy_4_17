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
	input port.PostInputPort
}

func NewPostController(
	input port.PostInputPort,
) *PostController {
	return &PostController{input: input}
}

type createPostRequest struct {
	Content     string `json:"content"`
	QuotePostID string `json:"quotePostId,omitempty"`
}

func (c *PostController) Create(ctx echo.Context) error {
	userID := authmw.UserID(ctx)

	var body createPostRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid body")
	}
	pw, err := c.input.Create(ctx.Request().Context(), post.CreatePostInput{
		UserID:      userID,
		Content:     body.Content,
		QuotePostID: body.QuotePostID,
	})
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, presenter.PostSingleResponse(pw))
}

func (c *PostController) GetByID(ctx echo.Context, postID string) error {
	viewerID := ctx.QueryParam("viewerId")
	pw, err := c.input.GetByID(ctx.Request().Context(), postID, viewerID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.PostSingleResponse(pw))
}

func (c *PostController) ListTimeline(ctx echo.Context) error {
	limit, _ := strconv.Atoi(ctx.QueryParam("limit"))
	offset, _ := strconv.Atoi(ctx.QueryParam("offset"))
	viewerID := ctx.QueryParam("viewerId")
	posts, total, err := c.input.ListTimeline(ctx.Request().Context(), limit, offset, viewerID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.PostsListResponse(posts, total))
}

func (c *PostController) ListByUserID(ctx echo.Context, userID string) error {
	limit, _ := strconv.Atoi(ctx.QueryParam("limit"))
	offset, _ := strconv.Atoi(ctx.QueryParam("offset"))
	viewerID := ctx.QueryParam("viewerId")
	posts, total, err := c.input.ListByUserID(ctx.Request().Context(), userID, limit, offset, viewerID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.PostsListResponse(posts, total))
}

func (c *PostController) Delete(ctx echo.Context, postID string) error {
	userID := authmw.UserID(ctx)

	if err := c.input.Delete(ctx.Request().Context(), postID, userID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.NoContent(http.StatusNoContent)
}

func (c *PostController) ToggleLike(ctx echo.Context, postID string) error {
	userID := authmw.UserID(ctx)

	liked, count, err := c.input.ToggleLike(ctx.Request().Context(), postID, userID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.PostLikeToggleResponse(liked, count))
}

func (c *PostController) ListLikedByUserID(ctx echo.Context, userID string) error {
	limit, _ := strconv.Atoi(ctx.QueryParam("limit"))
	offset, _ := strconv.Atoi(ctx.QueryParam("offset"))
	posts, total, err := c.input.ListLikedByUserID(ctx.Request().Context(), userID, limit, offset)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.PostsListResponse(posts, total))
}

func (c *PostController) ToggleRepost(ctx echo.Context, postID string) error {
	userID := authmw.UserID(ctx)

	reposted, count, err := c.input.ToggleRepost(ctx.Request().Context(), postID, userID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.PostRepostToggleResponse(reposted, count))
}

type createCommentRequest struct {
	Content string `json:"content"`
}

func (c *PostController) CreateComment(ctx echo.Context, postID string) error {
	userID := authmw.UserID(ctx)

	var body createCommentRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid body")
	}
	cw, err := c.input.CreateComment(ctx.Request().Context(), post.CreateCommentInput{
		PostID:  postID,
		UserID:  userID,
		Content: body.Content,
	})
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, presenter.PostCommentResponse(cw))
}

func (c *PostController) ListComments(ctx echo.Context, postID string) error {
	limit, _ := strconv.Atoi(ctx.QueryParam("limit"))
	offset, _ := strconv.Atoi(ctx.QueryParam("offset"))
	comments, total, err := c.input.ListComments(ctx.Request().Context(), postID, limit, offset)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.PostCommentsListResponse(comments, total))
}

func (c *PostController) DeleteComment(ctx echo.Context, commentID string) error {
	userID := authmw.UserID(ctx)

	if err := c.input.DeleteComment(ctx.Request().Context(), commentID, userID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.NoContent(http.StatusNoContent)
}
