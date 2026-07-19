package controller

import (
	"context"
	"net/http"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
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

// derefStr unwraps an optional string parameter, defaulting to "" (the same
// value the echo controllers passed for an absent query param).
func derefStr(v *string) string {
	if v == nil {
		return ""
	}
	return *v
}

// Create handles POST /api/posts.
func (c *PostController) Create(ctx context.Context, req openapi.PostsCreatePostRequestObject) (openapi.PostsCreatePostResponseObject, error) {
	pw, err := c.input.Create(ctx, post.CreatePostInput{
		UserID:      authmw.UserIDFromContext(ctx),
		Content:     req.Body.Content,
		QuotePostID: derefStr(req.Body.QuotePostId),
	})
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.PostsCreatePost404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.PostsCreatePost400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.PostsCreatePost201JSONResponse(presenter.PostSingleResponse(pw)), nil
}

// GetByID handles GET /api/posts/{postId}.
func (c *PostController) GetByID(ctx context.Context, req openapi.PostsGetPostRequestObject) (openapi.PostsGetPostResponseObject, error) {
	pw, err := c.input.GetByID(ctx, req.PostId, derefStr(req.Params.ViewerId))
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.PostsGetPost404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.PostsGetPost400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.PostsGetPost200JSONResponse(presenter.PostSingleResponse(pw)), nil
}

// ListTimeline handles GET /api/posts.
func (c *PostController) ListTimeline(ctx context.Context, req openapi.PostsListTimelinePostsRequestObject) (openapi.PostsListTimelinePostsResponseObject, error) {
	posts, total, err := c.input.ListTimeline(ctx, derefInt32(req.Params.Limit), derefInt32(req.Params.Offset), derefStr(req.Params.ViewerId))
	if err != nil {
		switch errorStatus(err) {
		case http.StatusBadRequest:
			return openapi.PostsListTimelinePosts400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.PostsListTimelinePosts200JSONResponse(presenter.PostsListResponse(posts, total)), nil
}

// ListByUserID handles GET /api/posts/users/{userId}.
func (c *PostController) ListByUserID(ctx context.Context, req openapi.PostsListPostsByUserRequestObject) (openapi.PostsListPostsByUserResponseObject, error) {
	posts, total, err := c.input.ListByUserID(ctx, req.UserId, derefInt32(req.Params.Limit), derefInt32(req.Params.Offset), derefStr(req.Params.ViewerId))
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.PostsListPostsByUser404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.PostsListPostsByUser400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.PostsListPostsByUser200JSONResponse(presenter.PostsListResponse(posts, total)), nil
}

// Delete handles DELETE /api/posts/{postId}.
func (c *PostController) Delete(ctx context.Context, req openapi.PostsDeletePostRequestObject) (openapi.PostsDeletePostResponseObject, error) {
	if err := c.input.Delete(ctx, req.PostId, authmw.UserIDFromContext(ctx)); err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.PostsDeletePost404JSONResponse(notFoundBody(err)), nil
		case http.StatusForbidden:
			return openapi.PostsDeletePost403JSONResponse(forbiddenBody(err)), nil
		case http.StatusBadRequest:
			return openapi.PostsDeletePost400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.PostsDeletePost204Response{}, nil
}

// ToggleLike handles POST /api/posts/{postId}/like.
func (c *PostController) ToggleLike(ctx context.Context, req openapi.PostsTogglePostLikeRequestObject) (openapi.PostsTogglePostLikeResponseObject, error) {
	liked, count, err := c.input.ToggleLike(ctx, req.PostId, authmw.UserIDFromContext(ctx))
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.PostsTogglePostLike404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.PostsTogglePostLike400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.PostsTogglePostLike200JSONResponse(presenter.PostLikeToggleResponse(liked, count)), nil
}

// ListLikedByUserID handles GET /api/posts/users/{userId}/likes.
func (c *PostController) ListLikedByUserID(ctx context.Context, req openapi.PostsListLikedPostsByUserRequestObject) (openapi.PostsListLikedPostsByUserResponseObject, error) {
	posts, total, err := c.input.ListLikedByUserID(ctx, req.UserId, derefInt32(req.Params.Limit), derefInt32(req.Params.Offset))
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.PostsListLikedPostsByUser404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.PostsListLikedPostsByUser400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.PostsListLikedPostsByUser200JSONResponse(presenter.PostsListResponse(posts, total)), nil
}

// ToggleRepost handles POST /api/posts/{postId}/repost.
func (c *PostController) ToggleRepost(ctx context.Context, req openapi.PostsTogglePostRepostRequestObject) (openapi.PostsTogglePostRepostResponseObject, error) {
	reposted, count, err := c.input.ToggleRepost(ctx, req.PostId, authmw.UserIDFromContext(ctx))
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.PostsTogglePostRepost404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.PostsTogglePostRepost400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.PostsTogglePostRepost200JSONResponse(presenter.PostRepostToggleResponse(reposted, count)), nil
}

// CreateComment handles POST /api/posts/{postId}/comments.
func (c *PostController) CreateComment(ctx context.Context, req openapi.PostsCreatePostCommentRequestObject) (openapi.PostsCreatePostCommentResponseObject, error) {
	cw, err := c.input.CreateComment(ctx, post.CreateCommentInput{
		PostID:  req.PostId,
		UserID:  authmw.UserIDFromContext(ctx),
		Content: req.Body.Content,
	})
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.PostsCreatePostComment404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.PostsCreatePostComment400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.PostsCreatePostComment201JSONResponse(presenter.PostCommentResponse(cw)), nil
}

// ListComments handles GET /api/posts/{postId}/comments.
func (c *PostController) ListComments(ctx context.Context, req openapi.PostsListPostCommentsRequestObject) (openapi.PostsListPostCommentsResponseObject, error) {
	comments, total, err := c.input.ListComments(ctx, req.PostId, derefInt32(req.Params.Limit), derefInt32(req.Params.Offset))
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.PostsListPostComments404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.PostsListPostComments400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.PostsListPostComments200JSONResponse(presenter.PostCommentsListResponse(comments, total)), nil
}

// DeleteComment handles DELETE /api/posts/comments/{commentId}.
func (c *PostController) DeleteComment(ctx context.Context, req openapi.PostsDeletePostCommentRequestObject) (openapi.PostsDeletePostCommentResponseObject, error) {
	if err := c.input.DeleteComment(ctx, req.CommentId, authmw.UserIDFromContext(ctx)); err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.PostsDeletePostComment404JSONResponse(notFoundBody(err)), nil
		case http.StatusForbidden:
			return openapi.PostsDeletePostComment403JSONResponse(forbiddenBody(err)), nil
		case http.StatusBadRequest:
			return openapi.PostsDeletePostComment400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.PostsDeletePostComment204Response{}, nil
}
