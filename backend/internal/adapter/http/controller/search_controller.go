package controller

import (
	"net/http"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/labstack/echo/v4"

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
func searchQuery(ctx echo.Context) (string, bool) {
	q := strings.TrimSpace(ctx.QueryParam("q"))
	if q == "" || utf8.RuneCountInString(q) > 100 {
		return "", false
	}
	return q, true
}

func searchPaging(ctx echo.Context) (limit, offset int) {
	limit, _ = strconv.Atoi(ctx.QueryParam("limit"))
	if limit < 1 || limit > 50 {
		limit = 20
	}
	offset, _ = strconv.Atoi(ctx.QueryParam("offset"))
	if offset < 0 {
		offset = 0
	}
	return limit, offset
}

func (c *SearchController) SearchAll(ctx echo.Context) error {
	q, ok := searchQuery(ctx)
	if !ok {
		return badRequest(ctx, "q must be 1-100 characters")
	}
	limitPerType, _ := strconv.Atoi(ctx.QueryParam("limitPerType"))
	if limitPerType < 1 || limitPerType > 10 {
		limitPerType = 3
	}

	result, err := c.input.SearchAll(ctx.Request().Context(), q, limitPerType)
	if err != nil {
		return internalError(ctx, err.Error())
	}
	return ctx.JSON(http.StatusOK, presenter.SearchAllResponse(result))
}

func (c *SearchController) SearchUsers(ctx echo.Context) error {
	q, ok := searchQuery(ctx)
	if !ok {
		return badRequest(ctx, "q must be 1-100 characters")
	}
	limit, offset := searchPaging(ctx)

	page, err := c.input.SearchUsers(ctx.Request().Context(), q, limit, offset)
	if err != nil {
		return internalError(ctx, err.Error())
	}
	return ctx.JSON(http.StatusOK, presenter.SearchUserListResponse(page))
}

func (c *SearchController) SearchArticles(ctx echo.Context) error {
	q, ok := searchQuery(ctx)
	if !ok {
		return badRequest(ctx, "q must be 1-100 characters")
	}
	limit, offset := searchPaging(ctx)

	page, err := c.input.SearchArticles(ctx.Request().Context(), q, limit, offset)
	if err != nil {
		return internalError(ctx, err.Error())
	}
	return ctx.JSON(http.StatusOK, presenter.SearchArticleListResponse(page))
}

func (c *SearchController) SearchPosts(ctx echo.Context) error {
	q, ok := searchQuery(ctx)
	if !ok {
		return badRequest(ctx, "q must be 1-100 characters")
	}
	limit, offset := searchPaging(ctx)

	page, err := c.input.SearchPosts(ctx.Request().Context(), q, limit, offset)
	if err != nil {
		return internalError(ctx, err.Error())
	}
	return ctx.JSON(http.StatusOK, presenter.SearchPostListResponse(page))
}

func (c *SearchController) SearchJobs(ctx echo.Context) error {
	q, ok := searchQuery(ctx)
	if !ok {
		return badRequest(ctx, "q must be 1-100 characters")
	}
	limit, offset := searchPaging(ctx)

	page, err := c.input.SearchJobs(ctx.Request().Context(), q, limit, offset)
	if err != nil {
		return internalError(ctx, err.Error())
	}
	return ctx.JSON(http.StatusOK, presenter.SearchJobListResponse(page))
}
