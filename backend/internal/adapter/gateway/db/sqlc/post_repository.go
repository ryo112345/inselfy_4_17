package sqlc

import (
	"context"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
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
	quotePostID, _ := parseUUID(p.QuotePostID)
	row, err := q.CreatePost(ctx, &generated.CreatePostParams{
		UserID:      userID,
		Content:     p.Content,
		QuotePostID: quotePostID,
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

func (r *PostRepository) GetWithUserByID(ctx context.Context, id string, viewerID string) (*post.PostWithUser, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return nil, domainerr.ErrNotFound
	}
	viewerUUID, _ := parseUUID(viewerID)
	row, err := q.GetPostWithUserByID(ctx, &generated.GetPostWithUserByIDParams{
		ID:     pgID,
		UserID: viewerUUID,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	pw := postRowConv.FromGetPostWithUserByIDRow(row)
	pw.QuotedPost = toQuotedPost(row.QuotePostID, row.QuoteContent, row.QuoteUsername, row.QuoteName, row.QuoteCreatedAt)
	return pw, nil
}

func (r *PostRepository) ListTimeline(ctx context.Context, limit, offset int, viewerID string) ([]*post.PostWithUser, int, error) {
	q := queriesForContext(ctx, r.queries)
	viewerUUID, _ := parseUUID(viewerID)
	rows, err := q.ListTimelinePosts(ctx, &generated.ListTimelinePostsParams{
		Limit:  int32(limit),
		Offset: int32(offset),
		UserID: viewerUUID,
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
		pw := postRowConv.FromListTimelinePostsRow(row)
		pw.QuotedPost = toQuotedPost(row.QuotePostID, row.QuoteContent, row.QuoteUsername, row.QuoteName, row.QuoteCreatedAt)
		posts[i] = pw
	}
	return posts, int(count), nil
}

func (r *PostRepository) ListByUserID(ctx context.Context, userID string, limit, offset int, viewerID string) ([]*post.PostWithUser, int, error) {
	q := queriesForContext(ctx, r.queries)
	pgUserID, err := parseUUID(userID)
	if err != nil {
		return nil, 0, domainerr.ErrBadRequest
	}
	viewerUUID, _ := parseUUID(viewerID)
	rows, err := q.ListPostsByUserID(ctx, &generated.ListPostsByUserIDParams{
		UserID:   pgUserID,
		Limit:    int32(limit),
		Offset:   int32(offset),
		UserID_2: viewerUUID,
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
		posts[i] = postRowConv.FromListPostsByUserIDRow(row)
	}
	return posts, int(count), nil
}

func (r *PostRepository) ListLikedByUserID(ctx context.Context, userID string, limit, offset int) ([]*post.PostWithUser, int, error) {
	q := queriesForContext(ctx, r.queries)
	pgUserID, err := parseUUID(userID)
	if err != nil {
		return nil, 0, domainerr.ErrBadRequest
	}
	rows, err := q.ListLikedPostsByUserID(ctx, &generated.ListLikedPostsByUserIDParams{
		UserID: pgUserID,
		Limit:  int32(limit),
		Offset: int32(offset),
	})
	if err != nil {
		return nil, 0, err
	}
	count, err := q.CountLikedPostsByUserID(ctx, pgUserID)
	if err != nil {
		return nil, 0, err
	}
	posts := make([]*post.PostWithUser, len(rows))
	for i, row := range rows {
		pw := postRowConv.FromListLikedPostsByUserIDRow(row)
		pw.QuotedPost = toQuotedPost(row.QuotePostID, row.QuoteContent, row.QuoteUsername, row.QuoteName, row.QuoteCreatedAt)
		posts[i] = pw
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

func (r *PostRepository) LikePost(ctx context.Context, postID, userID string) error {
	q := queriesForContext(ctx, r.queries)
	pgPostID, err := parseUUID(postID)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	pgUserID, err := parseUUID(userID)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	return q.LikePost(ctx, &generated.LikePostParams{
		PostID: pgPostID,
		UserID: pgUserID,
	})
}

func (r *PostRepository) UnlikePost(ctx context.Context, postID, userID string) error {
	q := queriesForContext(ctx, r.queries)
	pgPostID, err := parseUUID(postID)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	pgUserID, err := parseUUID(userID)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	return q.UnlikePost(ctx, &generated.UnlikePostParams{
		PostID: pgPostID,
		UserID: pgUserID,
	})
}

func (r *PostRepository) IsPostLiked(ctx context.Context, postID, userID string) (bool, error) {
	q := queriesForContext(ctx, r.queries)
	pgPostID, err := parseUUID(postID)
	if err != nil {
		return false, domainerr.ErrBadRequest
	}
	pgUserID, err := parseUUID(userID)
	if err != nil {
		return false, domainerr.ErrBadRequest
	}
	return q.IsPostLiked(ctx, &generated.IsPostLikedParams{
		PostID: pgPostID,
		UserID: pgUserID,
	})
}

func (r *PostRepository) CountPostLikes(ctx context.Context, postID string) (int, error) {
	q := queriesForContext(ctx, r.queries)
	pgPostID, err := parseUUID(postID)
	if err != nil {
		return 0, domainerr.ErrBadRequest
	}
	count, err := q.CountPostLikes(ctx, pgPostID)
	if err != nil {
		return 0, err
	}
	return int(count), nil
}

func (r *PostRepository) RepostPost(ctx context.Context, postID, userID string) error {
	q := queriesForContext(ctx, r.queries)
	pgPostID, err := parseUUID(postID)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	pgUserID, err := parseUUID(userID)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	return q.RepostPost(ctx, &generated.RepostPostParams{
		PostID: pgPostID,
		UserID: pgUserID,
	})
}

func (r *PostRepository) UndoRepost(ctx context.Context, postID, userID string) error {
	q := queriesForContext(ctx, r.queries)
	pgPostID, err := parseUUID(postID)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	pgUserID, err := parseUUID(userID)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	return q.UndoRepost(ctx, &generated.UndoRepostParams{
		PostID: pgPostID,
		UserID: pgUserID,
	})
}

func (r *PostRepository) IsPostReposted(ctx context.Context, postID, userID string) (bool, error) {
	q := queriesForContext(ctx, r.queries)
	pgPostID, err := parseUUID(postID)
	if err != nil {
		return false, domainerr.ErrBadRequest
	}
	pgUserID, err := parseUUID(userID)
	if err != nil {
		return false, domainerr.ErrBadRequest
	}
	return q.IsPostReposted(ctx, &generated.IsPostRepostedParams{
		PostID: pgPostID,
		UserID: pgUserID,
	})
}

func (r *PostRepository) CountPostReposts(ctx context.Context, postID string) (int, error) {
	q := queriesForContext(ctx, r.queries)
	pgPostID, err := parseUUID(postID)
	if err != nil {
		return 0, domainerr.ErrBadRequest
	}
	count, err := q.CountPostReposts(ctx, pgPostID)
	if err != nil {
		return 0, err
	}
	return int(count), nil
}

func (r *PostRepository) CreateComment(ctx context.Context, c *post.Comment) (*post.Comment, error) {
	q := queriesForContext(ctx, r.queries)
	pgPostID, err := parseUUID(c.PostID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	pgUserID, err := parseUUID(c.UserID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.CreatePostComment(ctx, &generated.CreatePostCommentParams{
		PostID:  pgPostID,
		UserID:  pgUserID,
		Content: c.Content,
	})
	if err != nil {
		return nil, err
	}
	return toDomainComment(row), nil
}

func (r *PostRepository) GetCommentByID(ctx context.Context, id string) (*post.Comment, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return nil, domainerr.ErrNotFound
	}
	row, err := q.GetPostCommentByID(ctx, pgID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	return toDomainComment(row), nil
}

func (r *PostRepository) ListComments(ctx context.Context, postID string, limit, offset int) ([]*post.CommentWithUser, int, error) {
	q := queriesForContext(ctx, r.queries)
	pgPostID, err := parseUUID(postID)
	if err != nil {
		return nil, 0, domainerr.ErrBadRequest
	}
	rows, err := q.ListPostComments(ctx, &generated.ListPostCommentsParams{
		PostID: pgPostID,
		Limit:  int32(limit),
		Offset: int32(offset),
	})
	if err != nil {
		return nil, 0, err
	}
	count, err := q.CountPostComments(ctx, pgPostID)
	if err != nil {
		return nil, 0, err
	}
	comments := make([]*post.CommentWithUser, len(rows))
	for i, row := range rows {
		comments[i] = &post.CommentWithUser{
			Comment: post.Comment{
				ID:        uuidToString(row.ID),
				PostID:    uuidToString(row.PostID),
				UserID:    uuidToString(row.UserID),
				Content:   row.Content,
				CreatedAt: row.CreatedAt.Time,
				UpdatedAt: row.UpdatedAt.Time,
			},
			Username: row.Username,
			Name:     row.UserName,
		}
	}
	return comments, int(count), nil
}

func (r *PostRepository) DeleteComment(ctx context.Context, id string) error {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return domainerr.ErrNotFound
	}
	return q.DeletePostComment(ctx, pgID)
}

func toDomainPost(p *generated.Post) *post.Post {
	return &post.Post{
		ID:          uuidToString(p.ID),
		UserID:      uuidToString(p.UserID),
		Content:     p.Content,
		QuotePostID: uuidToString(p.QuotePostID),
		CreatedAt:   p.CreatedAt.Time,
		UpdatedAt:   p.UpdatedAt.Time,
	}
}

func toQuotedPost(id pgtype.UUID, content, username, name string, createdAt pgtype.Timestamptz) *post.QuotedPost {
	if content == "" && username == "" {
		return nil
	}
	return &post.QuotedPost{
		ID:        uuidToString(id),
		Content:   content,
		Username:  username,
		Name:      name,
		CreatedAt: createdAt.Time,
	}
}

func toDomainComment(c *generated.PostComment) *post.Comment {
	return &post.Comment{
		ID:        uuidToString(c.ID),
		PostID:    uuidToString(c.PostID),
		UserID:    uuidToString(c.UserID),
		Content:   c.Content,
		CreatedAt: c.CreatedAt.Time,
		UpdatedAt: c.UpdatedAt.Time,
	}
}
