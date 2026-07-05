package usecase

import (
	"context"
	"strings"

	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/post"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type PostInteractor struct {
	repo port.PostRepository
}

var _ port.PostInputPort = (*PostInteractor)(nil)

func NewPostInteractor(repo port.PostRepository) *PostInteractor {
	return &PostInteractor{repo: repo}
}

func (i *PostInteractor) Create(ctx context.Context, input post.CreatePostInput) (*post.PostWithUser, error) {
	input.Content = strings.TrimSpace(input.Content)
	if err := post.ValidateCreate(input); err != nil {
		return nil, err
	}
	entity := &post.Post{
		UserID:      input.UserID,
		Content:     input.Content,
		QuotePostID: input.QuotePostID,
	}
	created, err := i.repo.Create(ctx, entity)
	if err != nil {
		return nil, err
	}
	return &post.PostWithUser{
		Post:     *created,
		Username: "",
		Name:     "",
	}, nil
}

func (i *PostInteractor) GetByID(ctx context.Context, postID, viewerID string) (*post.PostWithUser, error) {
	return i.repo.GetWithUserByID(ctx, postID, viewerID)
}

func (i *PostInteractor) ListTimeline(ctx context.Context, limit, offset int, viewerID string) ([]*post.PostWithUser, int, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	return i.repo.ListTimeline(ctx, limit, offset, viewerID)
}

func (i *PostInteractor) ListByUserID(ctx context.Context, userID string, limit, offset int, viewerID string) ([]*post.PostWithUser, int, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	return i.repo.ListByUserID(ctx, userID, limit, offset, viewerID)
}

func (i *PostInteractor) ListLikedByUserID(ctx context.Context, userID string, limit, offset int) ([]*post.PostWithUser, int, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	return i.repo.ListLikedByUserID(ctx, userID, limit, offset)
}

func (i *PostInteractor) Delete(ctx context.Context, postID, userID string) error {
	existing, err := i.repo.GetByID(ctx, postID)
	if err != nil {
		return err
	}
	if existing.UserID != userID {
		return domainerr.ErrNotFound
	}
	return i.repo.Delete(ctx, postID)
}

func (i *PostInteractor) ToggleLike(ctx context.Context, postID, userID string) (bool, int, error) {
	if _, err := i.repo.GetByID(ctx, postID); err != nil {
		return false, 0, err
	}
	liked, err := i.repo.IsPostLiked(ctx, postID, userID)
	if err != nil {
		return false, 0, err
	}
	if liked {
		if err := i.repo.UnlikePost(ctx, postID, userID); err != nil {
			return false, 0, err
		}
	} else {
		if err := i.repo.LikePost(ctx, postID, userID); err != nil {
			return false, 0, err
		}
	}
	count, err := i.repo.CountPostLikes(ctx, postID)
	if err != nil {
		return false, 0, err
	}
	return !liked, count, nil
}

func (i *PostInteractor) ToggleRepost(ctx context.Context, postID, userID string) (bool, int, error) {
	if _, err := i.repo.GetByID(ctx, postID); err != nil {
		return false, 0, err
	}
	reposted, err := i.repo.IsPostReposted(ctx, postID, userID)
	if err != nil {
		return false, 0, err
	}
	if reposted {
		if err := i.repo.UndoRepost(ctx, postID, userID); err != nil {
			return false, 0, err
		}
	} else {
		if err := i.repo.RepostPost(ctx, postID, userID); err != nil {
			return false, 0, err
		}
	}
	count, err := i.repo.CountPostReposts(ctx, postID)
	if err != nil {
		return false, 0, err
	}
	return !reposted, count, nil
}

func (i *PostInteractor) CreateComment(ctx context.Context, input post.CreateCommentInput) (*post.CommentWithUser, error) {
	input.Content = strings.TrimSpace(input.Content)
	if err := post.ValidateComment(input); err != nil {
		return nil, err
	}
	if _, err := i.repo.GetByID(ctx, input.PostID); err != nil {
		return nil, err
	}
	entity := &post.Comment{
		PostID:  input.PostID,
		UserID:  input.UserID,
		Content: input.Content,
	}
	created, err := i.repo.CreateComment(ctx, entity)
	if err != nil {
		return nil, err
	}
	return &post.CommentWithUser{
		Comment:  *created,
		Username: "",
		Name:     "",
	}, nil
}

func (i *PostInteractor) ListComments(ctx context.Context, postID string, limit, offset int) ([]*post.CommentWithUser, int, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	return i.repo.ListComments(ctx, postID, limit, offset)
}

func (i *PostInteractor) DeleteComment(ctx context.Context, commentID, userID string) error {
	existing, err := i.repo.GetCommentByID(ctx, commentID)
	if err != nil {
		return err
	}
	if existing.UserID != userID {
		return domainerr.ErrNotFound
	}
	return i.repo.DeleteComment(ctx, commentID)
}
