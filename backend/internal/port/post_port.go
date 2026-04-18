package port

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/post"
)

type PostInputPort interface {
	Create(ctx context.Context, input post.CreatePostInput) error
	ListTimeline(ctx context.Context, limit, offset int) error
	ListByUserID(ctx context.Context, userID string, limit, offset int) error
	Delete(ctx context.Context, postID, userID string) error
}

type PostOutputPort interface {
	PresentPost(ctx context.Context, p *post.PostWithUser) error
	PresentPosts(ctx context.Context, posts []*post.PostWithUser, total int) error
}

type PostRepository interface {
	Create(ctx context.Context, p *post.Post) (*post.Post, error)
	GetByID(ctx context.Context, id string) (*post.Post, error)
	ListTimeline(ctx context.Context, limit, offset int) ([]*post.PostWithUser, int, error)
	ListByUserID(ctx context.Context, userID string, limit, offset int) ([]*post.PostWithUser, int, error)
	Delete(ctx context.Context, id string) error
}
