package sqlc

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/post"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type PostRepository struct {
	queries *generated.Queries
}

var _ port.PostRepository = (*PostRepository)(nil)

func NewPostRepository(pool *pgxpool.Pool) *PostRepository {
	return &PostRepository{queries: generated.New(pool)}
}

func (r *PostRepository) Create(ctx context.Context, p *post.Post) (*post.Post, error) {
	q := queriesForContext(ctx, r.queries)
	userID, err := parseUUID(p.UserID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.CreatePost(ctx, &generated.CreatePostParams{
		UserID:  userID,
		Content: p.Content,
	})
	if err != nil {
		return nil, err
	}
	return toDomainPost(row), nil
}

func (r *PostRepository) GetByID(ctx context.Context, id string) (*post.Post, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return nil, domainerr.ErrNotFound
	}
	row, err := q.GetPostByID(ctx, pgID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	return toDomainPost(row), nil
}

func (r *PostRepository) ListTimeline(ctx context.Context, limit, offset int) ([]*post.PostWithUser, int, error) {
	q := queriesForContext(ctx, r.queries)
	rows, err := q.ListTimelinePosts(ctx, &generated.ListTimelinePostsParams{
		Limit:  int32(limit),
		Offset: int32(offset),
	})
	if err != nil {
		return nil, 0, err
	}
	count, err := q.CountTimelinePosts(ctx)
	if err != nil {
		return nil, 0, err
	}
	posts := make([]*post.PostWithUser, len(rows))
	for i, row := range rows {
		posts[i] = &post.PostWithUser{
			Post: post.Post{
				ID:        uuidToString(row.ID),
				UserID:    uuidToString(row.UserID),
				Content:   row.Content,
				CreatedAt: row.CreatedAt.Time,
				UpdatedAt: row.UpdatedAt.Time,
			},
			Username: row.Username,
			Name:     row.UserName,
		}
	}
	return posts, int(count), nil
}

func (r *PostRepository) ListByUserID(ctx context.Context, userID string, limit, offset int) ([]*post.PostWithUser, int, error) {
	q := queriesForContext(ctx, r.queries)
	pgUserID, err := parseUUID(userID)
	if err != nil {
		return nil, 0, domainerr.ErrBadRequest
	}
	rows, err := q.ListPostsByUserID(ctx, &generated.ListPostsByUserIDParams{
		UserID: pgUserID,
		Limit:  int32(limit),
		Offset: int32(offset),
	})
	if err != nil {
		return nil, 0, err
	}
	count, err := q.CountPostsByUserID(ctx, pgUserID)
	if err != nil {
		return nil, 0, err
	}
	posts := make([]*post.PostWithUser, len(rows))
	for i, row := range rows {
		posts[i] = &post.PostWithUser{
			Post: post.Post{
				ID:        uuidToString(row.ID),
				UserID:    uuidToString(row.UserID),
				Content:   row.Content,
				CreatedAt: row.CreatedAt.Time,
				UpdatedAt: row.UpdatedAt.Time,
			},
			Username: row.Username,
			Name:     row.UserName,
		}
	}
	return posts, int(count), nil
}

func (r *PostRepository) Delete(ctx context.Context, id string) error {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return domainerr.ErrNotFound
	}
	return q.DeletePost(ctx, pgID)
}

func toDomainPost(p *generated.Post) *post.Post {
	return &post.Post{
		ID:        uuidToString(p.ID),
		UserID:    uuidToString(p.UserID),
		Content:   p.Content,
		CreatedAt: p.CreatedAt.Time,
		UpdatedAt: p.UpdatedAt.Time,
	}
}
