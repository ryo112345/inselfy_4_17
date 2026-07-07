package sqlc

import (
	"time"

	"github.com/jackc/pgx/v5/pgtype"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
	"github.com/akiyama/inselfy/backend/internal/domain/post"
)

// postRowConverter maps the per-query sqlc row types onto post.PostWithUser.
// QuotedPost needs the toQuotedPost derivation (nil when there is no quote),
// so it is ignored here and attached by the caller. Run `make goverter` to
// regenerate.
//
// goverter:converter
// goverter:output:file ./post_row_converter.gen.go
// goverter:output:package github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc
// goverter:extend uuidToString timestamptzToTime int32ToInt
type postRowConverter interface {
	// goverter:map . Post
	// goverter:map UserName Name
	// goverter:ignore QuotedPost
	FromGetPostWithUserByIDRow(row *generated.GetPostWithUserByIDRow) *post.PostWithUser
	// goverter:map . Post
	// goverter:map UserName Name
	// goverter:ignore QuotedPost
	FromListTimelinePostsRow(row *generated.ListTimelinePostsRow) *post.PostWithUser
	// goverter:map . Post
	// goverter:map UserName Name
	// goverter:ignore QuotedPost
	FromListPostsByUserIDRow(row *generated.ListPostsByUserIDRow) *post.PostWithUser
	// goverter:map . Post
	// goverter:map UserName Name
	// goverter:ignore QuotedPost
	FromListLikedPostsByUserIDRow(row *generated.ListLikedPostsByUserIDRow) *post.PostWithUser

	// ListPostsByUserID の応答は歴史的に QuotePostID を含めない（挙動維持）。
	// goverter:ignore QuotePostID
	postFromListPostsByUserIDRow(row generated.ListPostsByUserIDRow) post.Post
}

var postRowConv postRowConverter = &postRowConverterImpl{}

func timestamptzToTime(t pgtype.Timestamptz) time.Time { return t.Time }

func int32ToInt(v int32) int { return int(v) }
