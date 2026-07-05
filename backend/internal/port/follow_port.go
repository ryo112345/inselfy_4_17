package port

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/follow"
)

type FollowInputPort interface {
	Follow(ctx context.Context, followerID, followingUsername string) error
	Unfollow(ctx context.Context, followerID, followingUsername string) error
	GetFollowers(ctx context.Context, username string, limit, offset int) ([]*follow.FollowWithUser, int, error)
	GetFollowing(ctx context.Context, username string, limit, offset int) ([]*follow.FollowWithUser, int, error)
	GetFollowStatus(ctx context.Context, currentUserID, username string) (*follow.FollowStatus, error)
}

type FollowRepository interface {
	Follow(ctx context.Context, followerID, followingID string) error
	Unfollow(ctx context.Context, followerID, followingID string) error
	IsFollowing(ctx context.Context, followerID, followingID string) (bool, error)
	ListFollowers(ctx context.Context, userID string, limit, offset int) ([]*follow.FollowWithUser, int, error)
	ListFollowing(ctx context.Context, userID string, limit, offset int) ([]*follow.FollowWithUser, int, error)
	GetCounts(ctx context.Context, userID string) (*follow.FollowCounts, error)
}
