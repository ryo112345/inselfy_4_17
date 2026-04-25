package port

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/article"
)

type ArticleInputPort interface {
	Create(ctx context.Context, input article.CreateArticleInput) error
	GetByID(ctx context.Context, id string, viewerUserID *string) error
	List(ctx context.Context, limit, offset int) error
	ListByAuthor(ctx context.Context, authorType article.AuthorType, authorID string, limit, offset int) error
	Update(ctx context.Context, id string, input article.UpdateArticleInput, authorType article.AuthorType, authorID string) error
	Delete(ctx context.Context, id string, authorType article.AuthorType, authorID string) error
	Publish(ctx context.Context, id string, authorType article.AuthorType, authorID string) error
	CreateCheckoutSession(ctx context.Context, articleID, buyerUserID string) error
}

type ArticleOutputPort interface {
	PresentArticle(ctx context.Context, a *article.ArticleWithAuthor, purchased bool, isAuthor bool) error
	PresentArticles(ctx context.Context, articles []*article.ArticleWithAuthor, total int) error
	PresentCheckoutSession(ctx context.Context, sessionURL string) error
}

type ArticleRepository interface {
	Create(ctx context.Context, a *article.Article) (*article.Article, error)
	GetByID(ctx context.Context, id string) (*article.ArticleWithAuthor, error)
	List(ctx context.Context, limit, offset int) ([]*article.ArticleWithAuthor, int, error)
	ListByAuthor(ctx context.Context, authorType article.AuthorType, authorID string, limit, offset int) ([]*article.ArticleWithAuthor, int, error)
	Update(ctx context.Context, a *article.Article) (*article.Article, error)
	Publish(ctx context.Context, id string) (*article.Article, error)
	Delete(ctx context.Context, id string) error
}

type ArticlePurchaseRepository interface {
	Create(ctx context.Context, p *article.Purchase) (*article.Purchase, error)
	HasPurchased(ctx context.Context, articleID, buyerUserID string) (bool, error)
	CompleteBySessionID(ctx context.Context, stripeSessionID string, paymentIntentID string) error
}

type StripeService interface {
	CreateCheckoutSession(ctx context.Context, a *article.Article, buyerUserID string) (sessionURL string, sessionID string, err error)
}
