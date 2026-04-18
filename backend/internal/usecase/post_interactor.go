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
		UserID:  input.UserID,
		Content: input.Content,
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

func (i *PostInteractor) ListTimeline(ctx context.Context, limit, offset int) error {
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	posts, total, err := i.repo.ListTimeline(ctx, limit, offset)
	if err != nil {
		return err
	}
	return i.output.PresentPosts(ctx, posts, total)
}

func (i *PostInteractor) ListByUserID(ctx context.Context, userID string, limit, offset int) error {
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	posts, total, err := i.repo.ListByUserID(ctx, userID, limit, offset)
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
