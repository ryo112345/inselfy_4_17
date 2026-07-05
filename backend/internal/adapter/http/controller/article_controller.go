package controller

import (
	"fmt"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/domain/article"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type ArticleController struct {
	input   port.ArticleInputPort
	storage port.FileStorage
}

func NewArticleController(
	input port.ArticleInputPort,
	storage port.FileStorage,
) *ArticleController {
	return &ArticleController{input: input, storage: storage}
}

type createArticleRequest struct {
	Title         string   `json:"title"`
	Body          string   `json:"body"`
	IsPaid        bool     `json:"isPaid"`
	PriceYen      int      `json:"priceYen"`
	CoverImageURL *string  `json:"coverImageUrl"`
	Tags          []string `json:"tags"`
}

type updateArticleRequest struct {
	Title         string   `json:"title"`
	Body          string   `json:"body"`
	IsPaid        bool     `json:"isPaid"`
	PriceYen      int      `json:"priceYen"`
	CoverImageURL *string  `json:"coverImageUrl"`
	Tags          []string `json:"tags"`
}

func (c *ArticleController) CreateAsUser(ctx echo.Context) error {
	userID := authmw.UserID(ctx)
	var body createArticleRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid body")
	}
	a, purchased, isAuthor, err := c.input.Create(ctx.Request().Context(), article.CreateArticleInput{
		AuthorType:    article.AuthorTypeUser,
		AuthorUserID:  &userID,
		Title:         body.Title,
		Body:          body.Body,
		IsPaid:        body.IsPaid,
		PriceYen:      body.PriceYen,
		CoverImageURL: body.CoverImageURL,
		Tags:          body.Tags,
	})
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, presenter.ArticleSingleResponse(a, purchased, isAuthor))
}

func (c *ArticleController) CreateAsCompany(ctx echo.Context) error {
	companyID := authmw.CompanyID(ctx)
	var body createArticleRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid body")
	}
	a, purchased, isAuthor, err := c.input.Create(ctx.Request().Context(), article.CreateArticleInput{
		AuthorType:      article.AuthorTypeCompany,
		AuthorCompanyID: &companyID,
		Title:           body.Title,
		Body:            body.Body,
		IsPaid:          body.IsPaid,
		PriceYen:        body.PriceYen,
	})
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, presenter.ArticleSingleResponse(a, purchased, isAuthor))
}

func (c *ArticleController) GetByID(ctx echo.Context, id string) error {
	var viewerUserID *string
	if uid, ok := ctx.Get(authmw.UserIDKey).(string); ok && uid != "" {
		viewerUserID = &uid
	}
	a, purchased, isAuthor, err := c.input.GetByID(ctx.Request().Context(), id, viewerUserID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.ArticleSingleResponse(a, purchased, isAuthor))
}

func (c *ArticleController) List(ctx echo.Context) error {
	limit, _ := strconv.Atoi(ctx.QueryParam("limit"))
	offset, _ := strconv.Atoi(ctx.QueryParam("offset"))
	articles, total, err := c.input.List(ctx.Request().Context(), limit, offset)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.ArticlesListResponse(articles, total))
}

func (c *ArticleController) ListMine(ctx echo.Context) error {
	userID := authmw.UserID(ctx)
	limit, _ := strconv.Atoi(ctx.QueryParam("limit"))
	offset, _ := strconv.Atoi(ctx.QueryParam("offset"))
	articles, total, err := c.input.ListByAuthor(ctx.Request().Context(), article.AuthorTypeUser, userID, limit, offset)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.ArticlesListResponse(articles, total))
}

func (c *ArticleController) UpdateAsUser(ctx echo.Context, id string) error {
	userID := authmw.UserID(ctx)
	var body updateArticleRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid body")
	}
	a, purchased, isAuthor, err := c.input.Update(ctx.Request().Context(), id, article.UpdateArticleInput{
		Title:         body.Title,
		Body:          body.Body,
		IsPaid:        body.IsPaid,
		PriceYen:      body.PriceYen,
		CoverImageURL: body.CoverImageURL,
		Tags:          body.Tags,
	}, article.AuthorTypeUser, userID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.ArticleSingleResponse(a, purchased, isAuthor))
}

func (c *ArticleController) UpdateAsCompany(ctx echo.Context, id string) error {
	companyID := authmw.CompanyID(ctx)
	var body updateArticleRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid body")
	}
	a, purchased, isAuthor, err := c.input.Update(ctx.Request().Context(), id, article.UpdateArticleInput{
		Title:         body.Title,
		Body:          body.Body,
		IsPaid:        body.IsPaid,
		PriceYen:      body.PriceYen,
		CoverImageURL: body.CoverImageURL,
		Tags:          body.Tags,
	}, article.AuthorTypeCompany, companyID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.ArticleSingleResponse(a, purchased, isAuthor))
}

func (c *ArticleController) DeleteAsUser(ctx echo.Context, id string) error {
	userID := authmw.UserID(ctx)
	if err := c.input.Delete(ctx.Request().Context(), id, article.AuthorTypeUser, userID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.NoContent(http.StatusNoContent)
}

func (c *ArticleController) DeleteAsCompany(ctx echo.Context, id string) error {
	companyID := authmw.CompanyID(ctx)
	if err := c.input.Delete(ctx.Request().Context(), id, article.AuthorTypeCompany, companyID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.NoContent(http.StatusNoContent)
}

func (c *ArticleController) PublishAsUser(ctx echo.Context, id string) error {
	userID := authmw.UserID(ctx)
	a, purchased, isAuthor, err := c.input.Publish(ctx.Request().Context(), id, article.AuthorTypeUser, userID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.ArticleSingleResponse(a, purchased, isAuthor))
}

func (c *ArticleController) PublishAsCompany(ctx echo.Context, id string) error {
	companyID := authmw.CompanyID(ctx)
	a, purchased, isAuthor, err := c.input.Publish(ctx.Request().Context(), id, article.AuthorTypeCompany, companyID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.ArticleSingleResponse(a, purchased, isAuthor))
}

func (c *ArticleController) CreateCheckout(ctx echo.Context, id string) error {
	userID := authmw.UserID(ctx)
	sessionURL, err := c.input.CreateCheckoutSession(ctx.Request().Context(), id, userID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.ArticleCheckoutResponse(sessionURL))
}

func (c *ArticleController) UploadImage(ctx echo.Context) error {
	file, err := ctx.FormFile("file")
	if err != nil {
		return badRequest(ctx, "file is required")
	}
	if file.Size > 5*1024*1024 {
		return badRequest(ctx, "file too large (max 5MB)")
	}
	ct := file.Header.Get("Content-Type")
	if !strings.HasPrefix(ct, "image/") {
		return badRequest(ctx, "only image files are allowed")
	}
	ext := filepath.Ext(file.Filename)
	if ext == "" {
		switch ct {
		case "image/jpeg":
			ext = ".jpg"
		case "image/png":
			ext = ".png"
		case "image/webp":
			ext = ".webp"
		default:
			ext = ".jpg"
		}
	}
	src, err := file.Open()
	if err != nil {
		return internalError(ctx, "failed to read file")
	}
	defer src.Close()
	key := fmt.Sprintf("article-images/%s%s", uuid.New().String(), ext)
	url, err := c.storage.Save(ctx.Request().Context(), key, src)
	if err != nil {
		return internalError(ctx, "failed to save file")
	}
	return ctx.JSON(http.StatusOK, map[string]string{"url": url})
}

var unauthorizedResponse = map[string]string{
	"code":    "UNAUTHORIZED",
	"message": "unauthorized",
}
