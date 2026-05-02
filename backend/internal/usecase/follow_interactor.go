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
	output   port.FollowOutputPort
}

var _ port.FollowInputPort = (*FollowInteractor)(nil)

func NewFollowInteractor(repo port.FollowRepository, userRepo port.UserRepository, output port.FollowOutputPort) *FollowInteractor {
	return &FollowInteractor{repo: repo, userRepo: userRepo, output: output}
}

func (i *FollowInteractor) Follow(ctx context.Context, followerID, followingUsername string) error {
	target, err := i.userRepo.GetByUsername(ctx, user.Username(followingUsername))
	if err != nil {
		return err
	}
	if target.ID == followerID {
		return domainerr.NewValidation("cannot follow yourself")
	}
	if err := i.repo.Follow(ctx, followerID, target.ID); err != nil {
		return err
	}
	return i.output.PresentOK(ctx)
}

func (i *FollowInteractor) Unfollow(ctx context.Context, followerID, followingUsername string) error {
	target, err := i.userRepo.GetByUsername(ctx, user.Username(followingUsername))
	if err != nil {
		return err
	}
	if err := i.repo.Unfollow(ctx, followerID, target.ID); err != nil {
		return err
	}
	return i.output.PresentOK(ctx)
}

func (i *FollowInteractor) GetFollowers(ctx context.Context, username string, limit, offset int) error {
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	target, err := i.userRepo.GetByUsername(ctx, user.Username(username))
	if err != nil {
		return err
	}
	users, total, err := i.repo.ListFollowers(ctx, target.ID, limit, offset)
	if err != nil {
		return err
	}
	return i.output.PresentFollowUsers(ctx, users, total)
}

func (i *FollowInteractor) GetFollowing(ctx context.Context, username string, limit, offset int) error {
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	target, err := i.userRepo.GetByUsername(ctx, user.Username(username))
	if err != nil {
		return err
	}
	users, total, err := i.repo.ListFollowing(ctx, target.ID, limit, offset)
	if err != nil {
		return err
	}
	return i.output.PresentFollowUsers(ctx, users, total)
}

func (i *FollowInteractor) GetFollowStatus(ctx context.Context, currentUserID, username string) error {
	target, err := i.userRepo.GetByUsername(ctx, user.Username(username))
	if err != nil {
		return err
	}
	following, err := i.repo.IsFollowing(ctx, currentUserID, target.ID)
	if err != nil {
		return err
	}
	followedBy, err := i.repo.IsFollowing(ctx, target.ID, currentUserID)
	if err != nil {
		return err
	}
	return i.output.PresentFollowStatus(ctx, &follow.FollowStatus{
		Following:  following,
		FollowedBy: followedBy,
	})
}
