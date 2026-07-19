package controller

import (
	"context"
	"strings"
	"unicode/utf8"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type SearchController struct {
	input port.SearchInputPort
}

func NewSearchController(input port.SearchInputPort) *SearchController {
	return &SearchController{input: input}
}

// searchQuery validates the q parameter shared by all search endpoints.
// 上流の OpenAPI validator が minLength/maxLength を検査するが、trim 後の
// 空文字（空白のみの q）はここでしか弾けないため従来ロジックを維持する。
func searchQuery(raw string) (string, bool) {
	q := strings.TrimSpace(raw)
	if q == "" || utf8.RuneCountInString(q) > 100 {
		return "", false
	}
	return q, true
}

func searchPaging(limitParam, offsetParam *int32) (limit, offset int) {
	limit = derefInt32(limitParam)
	if limit < 1 || limit > 50 {
		limit = 20
	}
	offset = derefInt32(offsetParam)
	if offset < 0 {
		offset = 0
	}
	return limit, offset
}

// SearchAll handles GET /api/search.
func (c *SearchController) SearchAll(ctx context.Context, req openapi.SearchSearchAllRequestObject) (openapi.SearchSearchAllResponseObject, error) {
	q, ok := searchQuery(req.Params.Q)
	if !ok {
		return openapi.SearchSearchAll400JSONResponse(badRequestBody("q must be 1-100 characters")), nil
	}
	limitPerType := derefInt32(req.Params.LimitPerType)
	if limitPerType < 1 || limitPerType > 10 {
		limitPerType = 3
	}

	result, err := c.input.SearchAll(ctx, q, limitPerType)
	if err != nil {
		return nil, err
	}
	return openapi.SearchSearchAll200JSONResponse(presenter.SearchAllResponse(result)), nil
}

// SearchUsers handles GET /api/search/users.
func (c *SearchController) SearchUsers(ctx context.Context, req openapi.SearchSearchUsersRequestObject) (openapi.SearchSearchUsersResponseObject, error) {
	q, ok := searchQuery(req.Params.Q)
	if !ok {
		return openapi.SearchSearchUsers400JSONResponse(badRequestBody("q must be 1-100 characters")), nil
	}
	limit, offset := searchPaging(req.Params.Limit, req.Params.Offset)

	page, err := c.input.SearchUsers(ctx, q, limit, offset)
	if err != nil {
		return nil, err
	}
	return openapi.SearchSearchUsers200JSONResponse(presenter.SearchUserListResponse(page)), nil
}

// SearchArticles handles GET /api/search/articles.
func (c *SearchController) SearchArticles(ctx context.Context, req openapi.SearchSearchArticlesRequestObject) (openapi.SearchSearchArticlesResponseObject, error) {
	q, ok := searchQuery(req.Params.Q)
	if !ok {
		return openapi.SearchSearchArticles400JSONResponse(badRequestBody("q must be 1-100 characters")), nil
	}
	limit, offset := searchPaging(req.Params.Limit, req.Params.Offset)

	page, err := c.input.SearchArticles(ctx, q, limit, offset)
	if err != nil {
		return nil, err
	}
	return openapi.SearchSearchArticles200JSONResponse(presenter.SearchArticleListResponse(page)), nil
}

// SearchPosts handles GET /api/search/posts.
func (c *SearchController) SearchPosts(ctx context.Context, req openapi.SearchSearchPostsRequestObject) (openapi.SearchSearchPostsResponseObject, error) {
	q, ok := searchQuery(req.Params.Q)
	if !ok {
		return openapi.SearchSearchPosts400JSONResponse(badRequestBody("q must be 1-100 characters")), nil
	}
	limit, offset := searchPaging(req.Params.Limit, req.Params.Offset)

	page, err := c.input.SearchPosts(ctx, q, limit, offset)
	if err != nil {
		return nil, err
	}
	return openapi.SearchSearchPosts200JSONResponse(presenter.SearchPostListResponse(page)), nil
}

// SearchJobs handles GET /api/search/jobs.
func (c *SearchController) SearchJobs(ctx context.Context, req openapi.SearchSearchJobsRequestObject) (openapi.SearchSearchJobsResponseObject, error) {
	q, ok := searchQuery(req.Params.Q)
	if !ok {
		return openapi.SearchSearchJobs400JSONResponse(badRequestBody("q must be 1-100 characters")), nil
	}
	limit, offset := searchPaging(req.Params.Limit, req.Params.Offset)

	page, err := c.input.SearchJobs(ctx, q, limit, offset)
	if err != nil {
		return nil, err
	}
	return openapi.SearchSearchJobs200JSONResponse(presenter.SearchJobListResponse(page)), nil
}
