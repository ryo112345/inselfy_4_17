package usecase

import (
	"context"

	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/follow"
	"github.com/akiyama/inselfy/backend/internal/domain/user"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type FollowInteractor struct {
	repo     port.FollowRepository
	userRepo port.UserRepository
}

var _ port.FollowInputPort = (*FollowInteractor)(nil)

func NewFollowInteractor(repo port.FollowRepository, userRepo port.UserRepository) *FollowInteractor {
	return &FollowInteractor{repo: repo, userRepo: userRepo}
}

func (i *FollowInteractor) Follow(ctx context.Context, followerID, followingUsername string) error {
	target, err := i.userRepo.GetByUsername(ctx, user.Username(followingUsername))
	if err != nil {
		return err
	}
	if target.ID == followerID {
		return domainerr.NewValidation("cannot follow yourself")
	}
	return i.repo.Follow(ctx, followerID, target.ID)
}

func (i *FollowInteractor) Unfollow(ctx context.Context, followerID, followingUsername string) error {
	target, err := i.userRepo.GetByUsername(ctx, user.Username(followingUsername))
	if err != nil {
		return err
	}
	return i.repo.Unfollow(ctx, followerID, target.ID)
}

func (i *FollowInteractor) GetFollowers(ctx context.Context, username string, limit, offset int) ([]*follow.FollowWithUser, int, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	target, err := i.userRepo.GetByUsername(ctx, user.Username(username))
	if err != nil {
		return nil, 0, err
	}
	return i.repo.ListFollowers(ctx, target.ID, limit, offset)
}

func (i *FollowInteractor) GetFollowing(ctx context.Context, username string, limit, offset int) ([]*follow.FollowWithUser, int, error) {
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	target, err := i.userRepo.GetByUsername(ctx, user.Username(username))
	if err != nil {
		return nil, 0, err
	}
	return i.repo.ListFollowing(ctx, target.ID, limit, offset)
}

func (i *FollowInteractor) GetFollowStatus(ctx context.Context, currentUserID, username string) (*follow.FollowStatus, error) {
	target, err := i.userRepo.GetByUsername(ctx, user.Username(username))
	if err != nil {
		return nil, err
	}
	following, err := i.repo.IsFollowing(ctx, currentUserID, target.ID)
	if err != nil {
		return nil, err
	}
	followedBy, err := i.repo.IsFollowing(ctx, target.ID, currentUserID)
	if err != nil {
		return nil, err
	}
	return &follow.FollowStatus{
		Following:  following,
		FollowedBy: followedBy,
	}, nil
}
