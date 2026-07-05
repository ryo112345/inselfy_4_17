package presenter

import (
	"time"

	"github.com/akiyama/inselfy/backend/internal/domain/article"
)

type ArticleResponse struct {
	ID             string     `json:"id"`
	AuthorType     string     `json:"authorType"`
	AuthorName     string     `json:"authorName"`
	AuthorUsername *string    `json:"authorUsername,omitempty"`
	Title          string     `json:"title"`
	Body           string     `json:"body"`
	FreePreview    string     `json:"freePreview"`
	IsPaid         bool       `json:"isPaid"`
	PriceYen       int        `json:"priceYen"`
	Purchased      bool       `json:"purchased"`
	IsAuthor       bool       `json:"isAuthor"`
	CharCount      int        `json:"charCount"`
	ImageCount     int        `json:"imageCount"`
	Status         string     `json:"status"`
	CoverImageURL  *string    `json:"coverImageUrl,omitempty"`
	Tags           []string   `json:"tags"`
	CreatedAt      time.Time  `json:"createdAt"`
	UpdatedAt      time.Time  `json:"updatedAt"`
	PublishedAt    *time.Time `json:"publishedAt,omitempty"`
}

type ArticleListResponse struct {
	Items []*ArticleResponse `json:"items"`
	Total int                `json:"total"`
}

type CheckoutSessionResponse struct {
	URL string `json:"url"`
}

// ArticleSingleResponse converts a single article to its API response.
func ArticleSingleResponse(a *article.ArticleWithAuthor, purchased, isAuthor bool) any {
	freePreview, _ := article.SplitBody(a.Article.Body)

	resp := &ArticleResponse{
		ID:             a.Article.ID,
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
		Status:         string(a.Article.Status),
		CoverImageURL:  a.Article.CoverImageURL,
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
	items := make([]*ArticleResponse, len(articles))
	for i, a := range articles {
		freePreview, _ := article.SplitBody(a.Article.Body)
		items[i] = &ArticleResponse{
			ID:             a.Article.ID,
			AuthorType:     string(a.Article.AuthorType),
			AuthorName:     a.AuthorName,
			AuthorUsername: a.AuthorUsername,
			Title:          a.Article.Title,
			FreePreview:    freePreview,
			IsPaid:         a.Article.IsPaid,
			PriceYen:       a.Article.PriceYen,
			Status:         string(a.Article.Status),
			CoverImageURL:  a.Article.CoverImageURL,
			Tags:           a.Article.Tags,
			CreatedAt:      a.Article.CreatedAt,
			UpdatedAt:      a.Article.UpdatedAt,
			PublishedAt:    a.Article.PublishedAt,
		}
	}
	return &ArticleListResponse{Items: items, Total: total}
}

// ArticleCheckoutResponse builds the Stripe checkout-session API response.
func ArticleCheckoutResponse(sessionURL string) any {
	return &CheckoutSessionResponse{URL: sessionURL}
}
