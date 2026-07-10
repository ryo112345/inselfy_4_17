package usecase

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/search"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// SearchInteractor implements port.SearchInputPort.
type SearchInteractor struct {
	query port.SearchQueryService
}

var _ port.SearchInputPort = (*SearchInteractor)(nil)

func NewSearchInteractor(query port.SearchQueryService) *SearchInteractor {
	return &SearchInteractor{query: query}
}

func (i *SearchInteractor) SearchAll(ctx context.Context, q string, limitPerType int) (*search.Result, error) {
	users, err := i.SearchUsers(ctx, q, limitPerType, 0)
	if err != nil {
		return nil, err
	}
	articles, err := i.SearchArticles(ctx, q, limitPerType, 0)
	if err != nil {
		return nil, err
	}
	posts, err := i.SearchPosts(ctx, q, limitPerType, 0)
	if err != nil {
		return nil, err
	}
	jobs, err := i.SearchJobs(ctx, q, limitPerType, 0)
	if err != nil {
		return nil, err
	}
	return &search.Result{Users: users, Articles: articles, Posts: posts, Jobs: jobs}, nil
}

func (i *SearchInteractor) SearchUsers(ctx context.Context, q string, limit, offset int) (search.Page[search.UserHit], error) {
	items, total, err := i.query.SearchUsers(ctx, q, limit, offset)
	if err != nil {
		return search.Page[search.UserHit]{}, err
	}
	return search.Page[search.UserHit]{Items: items, Total: total}, nil
}

func (i *SearchInteractor) SearchArticles(ctx context.Context, q string, limit, offset int) (search.Page[search.ArticleHit], error) {
	items, total, err := i.query.SearchArticles(ctx, q, limit, offset)
	if err != nil {
		return search.Page[search.ArticleHit]{}, err
	}
	return search.Page[search.ArticleHit]{Items: items, Total: total}, nil
}

func (i *SearchInteractor) SearchPosts(ctx context.Context, q string, limit, offset int) (search.Page[search.PostHit], error) {
	items, total, err := i.query.SearchPosts(ctx, q, limit, offset)
	if err != nil {
		return search.Page[search.PostHit]{}, err
	}
	return search.Page[search.PostHit]{Items: items, Total: total}, nil
}

func (i *SearchInteractor) SearchJobs(ctx context.Context, q string, limit, offset int) (search.Page[search.JobHit], error) {
	items, total, err := i.query.SearchJobs(ctx, q, limit, offset)
	if err != nil {
		return search.Page[search.JobHit]{}, err
	}
	return search.Page[search.JobHit]{Items: items, Total: total}, nil
}
