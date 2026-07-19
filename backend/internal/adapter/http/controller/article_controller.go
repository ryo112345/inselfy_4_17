package controller

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/google/uuid"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
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

// CreateAsUser handles POST /api/articles.
func (c *ArticleController) CreateAsUser(ctx context.Context, req openapi.ArticlesCreateArticleRequestObject) (openapi.ArticlesCreateArticleResponseObject, error) {
	userID := authmw.UserIDFromContext(ctx)
	a, purchased, isAuthor, err := c.input.Create(ctx, article.CreateArticleInput{
		AuthorType:    article.AuthorTypeUser,
		AuthorUserID:  &userID,
		Title:         req.Body.Title,
		Body:          req.Body.Body,
		IsPaid:        req.Body.IsPaid,
		PriceYen:      req.Body.PriceYen,
		CoverImageURL: req.Body.CoverImageUrl,
		Tags:          req.Body.Tags,
	})
	if err != nil {
		switch errorStatus(err) {
		case http.StatusBadRequest:
			return openapi.ArticlesCreateArticle400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.ArticlesCreateArticle201JSONResponse(presenter.ArticleSingleResponse(a, purchased, isAuthor)), nil
}

// CreateAsCompany handles POST /api/company/articles.
func (c *ArticleController) CreateAsCompany(ctx context.Context, req openapi.CompanyArticlesCreateCompanyArticleRequestObject) (openapi.CompanyArticlesCreateCompanyArticleResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)
	a, purchased, isAuthor, err := c.input.Create(ctx, article.CreateArticleInput{
		AuthorType:      article.AuthorTypeCompany,
		AuthorCompanyID: &companyID,
		Title:           req.Body.Title,
		Body:            req.Body.Body,
		IsPaid:          req.Body.IsPaid,
		PriceYen:        req.Body.PriceYen,
	})
	if err != nil {
		switch errorStatus(err) {
		case http.StatusBadRequest:
			return openapi.CompanyArticlesCreateCompanyArticle400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.CompanyArticlesCreateCompanyArticle201JSONResponse(presenter.ArticleSingleResponse(a, purchased, isAuthor)), nil
}

// GetByID handles GET /api/articles/{articleId}. 認証は optional
// （security: [{CandidateAuth}, {}]）: 未認証でも 200 を返し、認証済みなら
// isAuthor / purchased の判定に viewer を使う。
func (c *ArticleController) GetByID(ctx context.Context, req openapi.ArticlesGetArticleRequestObject) (openapi.ArticlesGetArticleResponseObject, error) {
	var viewerUserID *string
	if uid := authmw.UserIDFromContext(ctx); uid != "" {
		viewerUserID = &uid
	}
	a, purchased, isAuthor, err := c.input.GetByID(ctx, req.ArticleId, viewerUserID)
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.ArticlesGetArticle404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.ArticlesGetArticle400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.ArticlesGetArticle200JSONResponse(presenter.ArticleSingleResponse(a, purchased, isAuthor)), nil
}

// List handles GET /api/articles.
func (c *ArticleController) List(ctx context.Context, req openapi.ArticlesListArticlesRequestObject) (openapi.ArticlesListArticlesResponseObject, error) {
	articles, total, err := c.input.List(ctx, derefInt32(req.Params.Limit), derefInt32(req.Params.Offset))
	if err != nil {
		switch errorStatus(err) {
		case http.StatusBadRequest:
			return openapi.ArticlesListArticles400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.ArticlesListArticles200JSONResponse(presenter.ArticlesListResponse(articles, total)), nil
}

// ListMine handles GET /api/articles/mine.
func (c *ArticleController) ListMine(ctx context.Context, req openapi.ArticlesListMyArticlesRequestObject) (openapi.ArticlesListMyArticlesResponseObject, error) {
	articles, total, err := c.input.ListByAuthor(ctx, article.AuthorTypeUser, authmw.UserIDFromContext(ctx), derefInt32(req.Params.Limit), derefInt32(req.Params.Offset))
	if err != nil {
		switch errorStatus(err) {
		case http.StatusBadRequest:
			return openapi.ArticlesListMyArticles400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.ArticlesListMyArticles200JSONResponse(presenter.ArticlesListResponse(articles, total)), nil
}

// UpdateAsUser handles PUT /api/articles/{articleId}.
func (c *ArticleController) UpdateAsUser(ctx context.Context, req openapi.ArticlesUpdateArticleRequestObject) (openapi.ArticlesUpdateArticleResponseObject, error) {
	a, purchased, isAuthor, err := c.input.Update(ctx, req.ArticleId, article.UpdateArticleInput{
		Title:         req.Body.Title,
		Body:          req.Body.Body,
		IsPaid:        req.Body.IsPaid,
		PriceYen:      req.Body.PriceYen,
		CoverImageURL: req.Body.CoverImageUrl,
		Tags:          req.Body.Tags,
	}, article.AuthorTypeUser, authmw.UserIDFromContext(ctx))
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.ArticlesUpdateArticle404JSONResponse(notFoundBody(err)), nil
		case http.StatusForbidden:
			return openapi.ArticlesUpdateArticle403JSONResponse(forbiddenBody(err)), nil
		case http.StatusBadRequest:
			return openapi.ArticlesUpdateArticle400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.ArticlesUpdateArticle200JSONResponse(presenter.ArticleSingleResponse(a, purchased, isAuthor)), nil
}

// UpdateAsCompany handles PUT /api/company/articles/{articleId}.
func (c *ArticleController) UpdateAsCompany(ctx context.Context, req openapi.CompanyArticlesUpdateCompanyArticleRequestObject) (openapi.CompanyArticlesUpdateCompanyArticleResponseObject, error) {
	a, purchased, isAuthor, err := c.input.Update(ctx, req.ArticleId, article.UpdateArticleInput{
		Title:         req.Body.Title,
		Body:          req.Body.Body,
		IsPaid:        req.Body.IsPaid,
		PriceYen:      req.Body.PriceYen,
		CoverImageURL: req.Body.CoverImageUrl,
		Tags:          req.Body.Tags,
	}, article.AuthorTypeCompany, authmw.CompanyIDFromContext(ctx))
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.CompanyArticlesUpdateCompanyArticle404JSONResponse(notFoundBody(err)), nil
		case http.StatusForbidden:
			return openapi.CompanyArticlesUpdateCompanyArticle403JSONResponse(forbiddenBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CompanyArticlesUpdateCompanyArticle400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.CompanyArticlesUpdateCompanyArticle200JSONResponse(presenter.ArticleSingleResponse(a, purchased, isAuthor)), nil
}

// DeleteAsUser handles DELETE /api/articles/{articleId}.
func (c *ArticleController) DeleteAsUser(ctx context.Context, req openapi.ArticlesDeleteArticleRequestObject) (openapi.ArticlesDeleteArticleResponseObject, error) {
	if err := c.input.Delete(ctx, req.ArticleId, article.AuthorTypeUser, authmw.UserIDFromContext(ctx)); err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.ArticlesDeleteArticle404JSONResponse(notFoundBody(err)), nil
		case http.StatusForbidden:
			return openapi.ArticlesDeleteArticle403JSONResponse(forbiddenBody(err)), nil
		case http.StatusBadRequest:
			return openapi.ArticlesDeleteArticle400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.ArticlesDeleteArticle204Response{}, nil
}

// DeleteAsCompany handles DELETE /api/company/articles/{articleId}.
func (c *ArticleController) DeleteAsCompany(ctx context.Context, req openapi.CompanyArticlesDeleteCompanyArticleRequestObject) (openapi.CompanyArticlesDeleteCompanyArticleResponseObject, error) {
	if err := c.input.Delete(ctx, req.ArticleId, article.AuthorTypeCompany, authmw.CompanyIDFromContext(ctx)); err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.CompanyArticlesDeleteCompanyArticle404JSONResponse(notFoundBody(err)), nil
		case http.StatusForbidden:
			return openapi.CompanyArticlesDeleteCompanyArticle403JSONResponse(forbiddenBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CompanyArticlesDeleteCompanyArticle400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.CompanyArticlesDeleteCompanyArticle204Response{}, nil
}

// PublishAsUser handles POST /api/articles/{articleId}/publish.
func (c *ArticleController) PublishAsUser(ctx context.Context, req openapi.ArticlesPublishArticleRequestObject) (openapi.ArticlesPublishArticleResponseObject, error) {
	a, purchased, isAuthor, err := c.input.Publish(ctx, req.ArticleId, article.AuthorTypeUser, authmw.UserIDFromContext(ctx))
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.ArticlesPublishArticle404JSONResponse(notFoundBody(err)), nil
		case http.StatusForbidden:
			return openapi.ArticlesPublishArticle403JSONResponse(forbiddenBody(err)), nil
		case http.StatusBadRequest:
			return openapi.ArticlesPublishArticle400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.ArticlesPublishArticle200JSONResponse(presenter.ArticleSingleResponse(a, purchased, isAuthor)), nil
}

// PublishAsCompany handles POST /api/company/articles/{articleId}/publish.
func (c *ArticleController) PublishAsCompany(ctx context.Context, req openapi.CompanyArticlesPublishCompanyArticleRequestObject) (openapi.CompanyArticlesPublishCompanyArticleResponseObject, error) {
	a, purchased, isAuthor, err := c.input.Publish(ctx, req.ArticleId, article.AuthorTypeCompany, authmw.CompanyIDFromContext(ctx))
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.CompanyArticlesPublishCompanyArticle404JSONResponse(notFoundBody(err)), nil
		case http.StatusForbidden:
			return openapi.CompanyArticlesPublishCompanyArticle403JSONResponse(forbiddenBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CompanyArticlesPublishCompanyArticle400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.CompanyArticlesPublishCompanyArticle200JSONResponse(presenter.ArticleSingleResponse(a, purchased, isAuthor)), nil
}

// CreateCheckout handles POST /api/articles/{articleId}/checkout.
func (c *ArticleController) CreateCheckout(ctx context.Context, req openapi.ArticlesCreateArticleCheckoutRequestObject) (openapi.ArticlesCreateArticleCheckoutResponseObject, error) {
	sessionURL, err := c.input.CreateCheckoutSession(ctx, req.ArticleId, authmw.UserIDFromContext(ctx))
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.ArticlesCreateArticleCheckout404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.ArticlesCreateArticleCheckout400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.ArticlesCreateArticleCheckout200JSONResponse(presenter.ArticleCheckoutResponse(sessionURL)), nil
}

// UploadImage handles POST /api/articles/upload-image.
func (c *ArticleController) UploadImage(ctx context.Context, req openapi.ArticlesUploadArticleImageRequestObject) (openapi.ArticlesUploadArticleImageResponseObject, error) {
	data, filename, ct, err := readFilePart(req.Body)
	switch {
	case errors.Is(err, errFilePartMissing):
		return openapi.ArticlesUploadArticleImage400JSONResponse(badRequestBody("file is required")), nil
	case errors.Is(err, errFilePartTooLarge):
		return openapi.ArticlesUploadArticleImage400JSONResponse(badRequestBody("file too large (max 5MB)")), nil
	case err != nil:
		return nil, err
	}
	if !strings.HasPrefix(ct, "image/") {
		return openapi.ArticlesUploadArticleImage400JSONResponse(badRequestBody("only image files are allowed")), nil
	}
	ext := filepath.Ext(filename)
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
	key := fmt.Sprintf("article-images/%s%s", uuid.New().String(), ext)
	url, err := c.storage.Save(ctx, key, bytes.NewReader(data))
	if err != nil {
		return nil, errors.New("failed to save file")
	}
	return openapi.ArticlesUploadArticleImage200JSONResponse(openapi.ModelsUploadUrlResponse{Url: url}), nil
}
