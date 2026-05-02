package sqlc

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/follow"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type FollowRepository struct {
	queries *generated.Queries
}

var _ port.FollowRepository = (*FollowRepository)(nil)

func NewFollowRepository(pool *pgxpool.Pool) *FollowRepository {
	return &FollowRepository{queries: generated.New(pool)}
}

func (r *FollowRepository) Follow(ctx context.Context, followerID, followingID string) error {
	q := queriesForContext(ctx, r.queries)
	fID, err := parseUUID(followerID)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	tID, err := parseUUID(followingID)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	if err := q.CreateFollow(ctx, &generated.CreateFollowParams{
		FollowerID:  fID,
		FollowingID: tID,
	}); err != nil {
		return err
	}
	if err := q.IncrementFollowingCount(ctx, fID); err != nil {
		return err
	}
	return q.IncrementFollowersCount(ctx, tID)
}

func (r *FollowRepository) Unfollow(ctx context.Context, followerID, followingID string) error {
	q := queriesForContext(ctx, r.queries)
	fID, err := parseUUID(followerID)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	tID, err := parseUUID(followingID)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	isFollowing, err := q.IsFollowing(ctx, &generated.IsFollowingParams{
		FollowerID:  fID,
		FollowingID: tID,
	})
	if err != nil {
		return err
	}
	if !isFollowing {
		return nil
	}
	if err := q.DeleteFollow(ctx, &generated.DeleteFollowParams{
		FollowerID:  fID,
		FollowingID: tID,
	}); err != nil {
		return err
	}
	if err := q.DecrementFollowingCount(ctx, fID); err != nil {
		return err
	}
	return q.DecrementFollowersCount(ctx, tID)
}

func (r *FollowRepository) IsFollowing(ctx context.Context, followerID, followingID string) (bool, error) {
	q := queriesForContext(ctx, r.queries)
	fID, err := parseUUID(followerID)
	if err != nil {
		return false, domainerr.ErrBadRequest
	}
	tID, err := parseUUID(followingID)
	if err != nil {
		return false, domainerr.ErrBadRequest
	}
	return q.IsFollowing(ctx, &generated.IsFollowingParams{
		FollowerID:  fID,
		FollowingID: tID,
	})
}

func (r *FollowRepository) ListFollowers(ctx context.Context, userID string, limit, offset int) ([]*follow.FollowWithUser, int, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(userID)
	if err != nil {
		return nil, 0, domainerr.ErrBadRequest
	}
	rows, err := q.ListFollowers(ctx, &generated.ListFollowersParams{
		FollowingID: pgID,
		Limit:       int32(limit),
		Offset:      int32(offset),
	})
	if err != nil {
		return nil, 0, err
	}
	count, err := q.CountFollowers(ctx, pgID)
	if err != nil {
		return nil, 0, err
	}
	return toFollowUsers(rows), int(count), nil
}

func (r *FollowRepository) ListFollowing(ctx context.Context, userID string, limit, offset int) ([]*follow.FollowWithUser, int, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(userID)
	if err != nil {
		return nil, 0, domainerr.ErrBadRequest
	}
	rows, err := q.ListFollowing(ctx, &generated.ListFollowingParams{
		FollowerID: pgID,
		Limit:      int32(limit),
		Offset:     int32(offset),
	})
	if err != nil {
		return nil, 0, err
	}
	count, err := q.CountFollowing(ctx, pgID)
	if err != nil {
		return nil, 0, err
	}
	return toFollowUsersFromFollowing(rows), int(count), nil
}

func (r *FollowRepository) GetCounts(ctx context.Context, userID string) (*follow.FollowCounts, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(userID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.GetFollowCounts(ctx, pgID)
	if err != nil {
		return nil, err
	}
	return &follow.FollowCounts{
		FollowersCount: int(row.FollowersCount),
		FollowingCount: int(row.FollowingCount),
	}, nil
}

func toFollowUsers(rows []*generated.ListFollowersRow) []*follow.FollowWithUser {
	users := make([]*follow.FollowWithUser, len(rows))
	for i, row := range rows {
		users[i] = &follow.FollowWithUser{
			UserID:    uuidToString(row.ID),
			Username:  row.Username,
			Name:      row.Name,
			AvatarURL: textPtr(row.AvatarUrl),
			Headline:  textPtr(row.Headline),
			CreatedAt: row.CreatedAt.Time,
		}
	}
	return users
}

func toFollowUsersFromFollowing(rows []*generated.ListFollowingRow) []*follow.FollowWithUser {
	users := make([]*follow.FollowWithUser, len(rows))
	for i, row := range rows {
		users[i] = &follow.FollowWithUser{
			UserID:    uuidToString(row.ID),
			Username:  row.Username,
			Name:      row.Name,
			AvatarURL: textPtr(row.AvatarUrl),
			Headline:  textPtr(row.Headline),
			CreatedAt: row.CreatedAt.Time,
		}
	}
	return users
}
