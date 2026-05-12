package usecase

import (
	"context"
	"strings"

	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/post"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type PostInteractor struct {
	repo   port.PostRepository
	output port.PostOutputPort
}

var _ port.PostInputPort = (*PostInteractor)(nil)

func NewPostInteractor(repo port.PostRepository, output port.PostOutputPort) *PostInteractor {
	return &PostInteractor{repo: repo, output: output}
}

func (i *PostInteractor) Create(ctx context.Context, input post.CreatePostInput) error {
	input.Content = strings.TrimSpace(input.Content)
	if err := post.ValidateCreate(input); err != nil {
		return err
	}
	entity := &post.Post{
		UserID:      input.UserID,
		Content:     input.Content,
		QuotePostID: input.QuotePostID,
	}
	created, err := i.repo.Create(ctx, entity)
	if err != nil {
		return err
	}
	return i.output.PresentPost(ctx, &post.PostWithUser{
		Post:     *created,
		Username: "",
		Name:     "",
	})
}

func (i *PostInteractor) GetByID(ctx context.Context, postID, viewerID string) error {
	pw, err := i.repo.GetWithUserByID(ctx, postID, viewerID)
	if err != nil {
		return err
	}
	return i.output.PresentPost(ctx, pw)
}

func (i *PostInteractor) ListTimeline(ctx context.Context, limit, offset int, viewerID string) error {
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	posts, total, err := i.repo.ListTimeline(ctx, limit, offset, viewerID)
	if err != nil {
		return err
	}
	return i.output.PresentPosts(ctx, posts, total)
}

func (i *PostInteractor) ListByUserID(ctx context.Context, userID string, limit, offset int, viewerID string) error {
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	posts, total, err := i.repo.ListByUserID(ctx, userID, limit, offset, viewerID)
	if err != nil {
		return err
	}
	return i.output.PresentPosts(ctx, posts, total)
}

func (i *PostInteractor) ListLikedByUserID(ctx context.Context, userID string, limit, offset int) error {
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	posts, total, err := i.repo.ListLikedByUserID(ctx, userID, limit, offset)
	if err != nil {
		return err
	}
	return i.output.PresentPosts(ctx, posts, total)
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

func (i *PostInteractor) ToggleLike(ctx context.Context, postID, userID string) error {
	if _, err := i.repo.GetByID(ctx, postID); err != nil {
		return err
	}
	liked, err := i.repo.IsPostLiked(ctx, postID, userID)
	if err != nil {
		return err
	}
	if liked {
		if err := i.repo.UnlikePost(ctx, postID, userID); err != nil {
			return err
		}
	} else {
		if err := i.repo.LikePost(ctx, postID, userID); err != nil {
			return err
		}
	}
	count, err := i.repo.CountPostLikes(ctx, postID)
	if err != nil {
		return err
	}
	return i.output.PresentLikeToggle(ctx, !liked, count)
}

func (i *PostInteractor) ToggleRepost(ctx context.Context, postID, userID string) error {
	if _, err := i.repo.GetByID(ctx, postID); err != nil {
		return err
	}
	reposted, err := i.repo.IsPostReposted(ctx, postID, userID)
	if err != nil {
		return err
	}
	if reposted {
		if err := i.repo.UndoRepost(ctx, postID, userID); err != nil {
			return err
		}
	} else {
		if err := i.repo.RepostPost(ctx, postID, userID); err != nil {
			return err
		}
	}
	count, err := i.repo.CountPostReposts(ctx, postID)
	if err != nil {
		return err
	}
	return i.output.PresentRepostToggle(ctx, !reposted, count)
}

func (i *PostInteractor) CreateComment(ctx context.Context, input post.CreateCommentInput) error {
	input.Content = strings.TrimSpace(input.Content)
	if err := post.ValidateComment(input); err != nil {
		return err
	}
	if _, err := i.repo.GetByID(ctx, input.PostID); err != nil {
		return err
	}
	entity := &post.Comment{
		PostID:  input.PostID,
		UserID:  input.UserID,
		Content: input.Content,
	}
	created, err := i.repo.CreateComment(ctx, entity)
	if err != nil {
		return err
	}
	return i.output.PresentComment(ctx, &post.CommentWithUser{
		Comment:  *created,
		Username: "",
		Name:     "",
	})
}

func (i *PostInteractor) ListComments(ctx context.Context, postID string, limit, offset int) error {
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	comments, total, err := i.repo.ListComments(ctx, postID, limit, offset)
	if err != nil {
		return err
	}
	return i.output.PresentComments(ctx, comments, total)
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
