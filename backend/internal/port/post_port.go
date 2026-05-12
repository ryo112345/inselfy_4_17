package port

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/post"
)

type PostInputPort interface {
	Create(ctx context.Context, input post.CreatePostInput) error
	GetByID(ctx context.Context, postID, viewerID string) error
	ListTimeline(ctx context.Context, limit, offset int, viewerID string) error
	ListByUserID(ctx context.Context, userID string, limit, offset int, viewerID string) error
	ListLikedByUserID(ctx context.Context, userID string, limit, offset int) error
	Delete(ctx context.Context, postID, userID string) error
	ToggleLike(ctx context.Context, postID, userID string) error
	ToggleRepost(ctx context.Context, postID, userID string) error
	CreateComment(ctx context.Context, input post.CreateCommentInput) error
	ListComments(ctx context.Context, postID string, limit, offset int) error
	DeleteComment(ctx context.Context, commentID, userID string) error
}

type PostOutputPort interface {
	PresentPost(ctx context.Context, p *post.PostWithUser) error
	PresentPosts(ctx context.Context, posts []*post.PostWithUser, total int) error
	PresentLikeToggle(ctx context.Context, liked bool, count int) error
	PresentRepostToggle(ctx context.Context, reposted bool, count int) error
	PresentComment(ctx context.Context, c *post.CommentWithUser) error
	PresentComments(ctx context.Context, comments []*post.CommentWithUser, total int) error
}

type PostRepository interface {
	Create(ctx context.Context, p *post.Post) (*post.Post, error)
	GetByID(ctx context.Context, id string) (*post.Post, error)
	GetWithUserByID(ctx context.Context, id string, viewerID string) (*post.PostWithUser, error)
	ListTimeline(ctx context.Context, limit, offset int, viewerID string) ([]*post.PostWithUser, int, error)
	ListByUserID(ctx context.Context, userID string, limit, offset int, viewerID string) ([]*post.PostWithUser, int, error)
	ListLikedByUserID(ctx context.Context, userID string, limit, offset int) ([]*post.PostWithUser, int, error)
	Delete(ctx context.Context, id string) error
	LikePost(ctx context.Context, postID, userID string) error
	UnlikePost(ctx context.Context, postID, userID string) error
	IsPostLiked(ctx context.Context, postID, userID string) (bool, error)
	CountPostLikes(ctx context.Context, postID string) (int, error)
	RepostPost(ctx context.Context, postID, userID string) error
	UndoRepost(ctx context.Context, postID, userID string) error
	IsPostReposted(ctx context.Context, postID, userID string) (bool, error)
	CountPostReposts(ctx context.Context, postID string) (int, error)
	CreateComment(ctx context.Context, c *post.Comment) (*post.Comment, error)
	GetCommentByID(ctx context.Context, id string) (*post.Comment, error)
	ListComments(ctx context.Context, postID string, limit, offset int) ([]*post.CommentWithUser, int, error)
	DeleteComment(ctx context.Context, id string) error
}
