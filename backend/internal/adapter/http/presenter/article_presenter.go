package presenter

import (
	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/domain/article"
)

// ArticleSingleResponse converts a single article to its API response.
func ArticleSingleResponse(a *article.ArticleWithAuthor, purchased, isAuthor bool) any {
	freePreview, _ := article.SplitBody(a.Article.Body)

	resp := &openapi.ModelsArticleResponse{
		Id:             a.Article.ID,
		AuthorType:     string(a.Article.AuthorType),
		AuthorName:     a.AuthorName,
		AuthorUsername: a.AuthorUsername,
		Title:          a.Article.Title,
		FreePreview:    freePreview,
		IsPaid:         a.Article.IsPaid,
		PriceYen:       a.Article.PriceYen,
		Purchased:      purchased,
		IsAuthor:       isAuthor,
		CharCount:      article.CountChars(a.Article.Body),
		ImageCount:     article.CountImages(a.Article.Body),
		Status:         openapi.ModelsArticleStatus(a.Article.Status),
		CoverImageUrl:  a.Article.CoverImageURL,
		Tags:           a.Article.Tags,
		CreatedAt:      a.Article.CreatedAt,
		UpdatedAt:      a.Article.UpdatedAt,
		PublishedAt:    a.Article.PublishedAt,
	}

	if !a.Article.IsPaid || purchased || isAuthor {
		resp.Body = a.Article.Body
	}

	return resp
}

// ArticlesListResponse converts a paginated list of articles to its API response.
func ArticlesListResponse(articles []*article.ArticleWithAuthor, total int) any {
	items := make([]openapi.ModelsArticleResponse, len(articles))
	for i, a := range articles {
		freePreview, _ := article.SplitBody(a.Article.Body)
		items[i] = openapi.ModelsArticleResponse{
			Id:             a.Article.ID,
			AuthorType:     string(a.Article.AuthorType),
			AuthorName:     a.AuthorName,
			AuthorUsername: a.AuthorUsername,
			Title:          a.Article.Title,
			FreePreview:    freePreview,
			IsPaid:         a.Article.IsPaid,
			PriceYen:       a.Article.PriceYen,
			Status:         openapi.ModelsArticleStatus(a.Article.Status),
			CoverImageUrl:  a.Article.CoverImageURL,
			Tags:           a.Article.Tags,
			CreatedAt:      a.Article.CreatedAt,
			UpdatedAt:      a.Article.UpdatedAt,
			PublishedAt:    a.Article.PublishedAt,
		}
	}
	return &openapi.ModelsArticleListResponse{Items: items, Total: total}
}

// ArticleCheckoutResponse builds the Stripe checkout-session API response.
func ArticleCheckoutResponse(sessionURL string) any {
	return &openapi.ModelsCheckoutSessionResponse{Url: sessionURL}
}
