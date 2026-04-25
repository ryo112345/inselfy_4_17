package presenter

import (
	"context"
	"time"

	"github.com/akiyama/inselfy/backend/internal/domain/article"
	"github.com/akiyama/inselfy/backend/internal/port"
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

type ArticlePresenter struct {
	single   *ArticleResponse
	list     *ArticleListResponse
	checkout *CheckoutSessionResponse
}

var _ port.ArticleOutputPort = (*ArticlePresenter)(nil)

func NewArticlePresenter() *ArticlePresenter {
	return &ArticlePresenter{}
}

func (p *ArticlePresenter) PresentArticle(_ context.Context, a *article.ArticleWithAuthor, purchased bool, isAuthor bool) error {
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

	p.single = resp
	return nil
}

func (p *ArticlePresenter) PresentArticles(_ context.Context, articles []*article.ArticleWithAuthor, total int) error {
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
	p.list = &ArticleListResponse{Items: items, Total: total}
	return nil
}

func (p *ArticlePresenter) PresentCheckoutSession(_ context.Context, sessionURL string) error {
	p.checkout = &CheckoutSessionResponse{URL: sessionURL}
	return nil
}

func (p *ArticlePresenter) SingleResponse() *ArticleResponse {
	return p.single
}

func (p *ArticlePresenter) ListResponse() *ArticleListResponse {
	return p.list
}

func (p *ArticlePresenter) CheckoutResponse() *CheckoutSessionResponse {
	return p.checkout
}
