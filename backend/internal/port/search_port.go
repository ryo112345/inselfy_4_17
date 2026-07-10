package port

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/search"
)

// SearchInputPort defines the cross-content search use case.
type SearchInputPort interface {
	SearchAll(ctx context.Context, q string, limitPerType int) (*search.Result, error)
	SearchUsers(ctx context.Context, q string, limit, offset int) (search.Page[search.UserHit], error)
	SearchArticles(ctx context.Context, q string, limit, offset int) (search.Page[search.ArticleHit], error)
	SearchPosts(ctx context.Context, q string, limit, offset int) (search.Page[search.PostHit], error)
	SearchJobs(ctx context.Context, q string, limit, offset int) (search.Page[search.JobHit], error)
}

// SearchQueryService runs keyword searches per content category.
type SearchQueryService interface {
	SearchUsers(ctx context.Context, q string, limit, offset int) ([]search.UserHit, int, error)
	SearchArticles(ctx context.Context, q string, limit, offset int) ([]search.ArticleHit, int, error)
	SearchPosts(ctx context.Context, q string, limit, offset int) ([]search.PostHit, int, error)
	SearchJobs(ctx context.Context, q string, limit, offset int) ([]search.JobHit, int, error)
}
