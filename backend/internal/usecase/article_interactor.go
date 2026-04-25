package usecase

import (
	"context"
	"strings"

	"github.com/akiyama/inselfy/backend/internal/domain/article"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type ArticleInteractor struct {
	repo         port.ArticleRepository
	purchaseRepo port.ArticlePurchaseRepository
	stripe       port.StripeService
	output       port.ArticleOutputPort
}

var _ port.ArticleInputPort = (*ArticleInteractor)(nil)

func NewArticleInteractor(
	repo port.ArticleRepository,
	purchaseRepo port.ArticlePurchaseRepository,
	stripe port.StripeService,
	output port.ArticleOutputPort,
) *ArticleInteractor {
	return &ArticleInteractor{
		repo:         repo,
		purchaseRepo: purchaseRepo,
		stripe:       stripe,
		output:       output,
	}
}

func (i *ArticleInteractor) Create(ctx context.Context, input article.CreateArticleInput) error {
	input.Title = strings.TrimSpace(input.Title)
	if err := article.ValidateCreate(input); err != nil {
		return err
	}
	entity := &article.Article{
		AuthorType:      input.AuthorType,
		AuthorUserID:    input.AuthorUserID,
		AuthorCompanyID: input.AuthorCompanyID,
		Title:           input.Title,
		Body:            input.Body,
		IsPaid:          input.IsPaid,
		PriceYen:        input.PriceYen,
		CoverImageURL:   input.CoverImageURL,
		Tags:            input.Tags,
	}
	created, err := i.repo.Create(ctx, entity)
	if err != nil {
		return err
	}
	return i.output.PresentArticle(ctx, &article.ArticleWithAuthor{Article: *created}, false, true)
}

func (i *ArticleInteractor) GetByID(ctx context.Context, id string, viewerUserID *string) error {
	a, err := i.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}

	purchased := false
	author := false
	if viewerUserID != nil {
		author = isAuthor(a, *viewerUserID)
		if a.Article.IsPaid && !author {
			purchased, err = i.purchaseRepo.HasPurchased(ctx, a.Article.ID, *viewerUserID)
			if err != nil {
				return err
			}
		}
	}

	return i.output.PresentArticle(ctx, a, purchased, author)
}

func (i *ArticleInteractor) List(ctx context.Context, limit, offset int) error {
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	articles, total, err := i.repo.List(ctx, limit, offset)
	if err != nil {
		return err
	}
	return i.output.PresentArticles(ctx, articles, total)
}

func (i *ArticleInteractor) ListByAuthor(ctx context.Context, authorType article.AuthorType, authorID string, limit, offset int) error {
	if limit <= 0 || limit > 50 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	articles, total, err := i.repo.ListByAuthor(ctx, authorType, authorID, limit, offset)
	if err != nil {
		return err
	}
	return i.output.PresentArticles(ctx, articles, total)
}

func (i *ArticleInteractor) Update(ctx context.Context, id string, input article.UpdateArticleInput, authorType article.AuthorType, authorID string) error {
	input.Title = strings.TrimSpace(input.Title)
	if err := article.ValidateUpdate(input); err != nil {
		return err
	}
	existing, err := i.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if !isAuthorByType(existing, authorType, authorID) {
		return article.ErrNotAuthor
	}
	existing.Article.Title = input.Title
	existing.Article.Body = input.Body
	existing.Article.IsPaid = input.IsPaid
	existing.Article.PriceYen = input.PriceYen
	existing.Article.CoverImageURL = input.CoverImageURL
	existing.Article.Tags = input.Tags
	updated, err := i.repo.Update(ctx, &existing.Article)
	if err != nil {
		return err
	}
	return i.output.PresentArticle(ctx, &article.ArticleWithAuthor{
		Article:        *updated,
		AuthorName:     existing.AuthorName,
		AuthorUsername: existing.AuthorUsername,
	}, false, true)
}

func (i *ArticleInteractor) Delete(ctx context.Context, id string, authorType article.AuthorType, authorID string) error {
	existing, err := i.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if !isAuthorByType(existing, authorType, authorID) {
		return domainerr.ErrNotFound
	}
	return i.repo.Delete(ctx, id)
}

func (i *ArticleInteractor) Publish(ctx context.Context, id string, authorType article.AuthorType, authorID string) error {
	existing, err := i.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	if !isAuthorByType(existing, authorType, authorID) {
		return article.ErrNotAuthor
	}
	_, err = i.repo.Publish(ctx, id)
	if err != nil {
		return err
	}
	a, err := i.repo.GetByID(ctx, id)
	if err != nil {
		return err
	}
	return i.output.PresentArticle(ctx, a, false, true)
}

func (i *ArticleInteractor) CreateCheckoutSession(ctx context.Context, articleID, buyerUserID string) error {
	a, err := i.repo.GetByID(ctx, articleID)
	if err != nil {
		return err
	}
	if a.Article.Status != article.StatusPublished {
		return article.ErrNotPublished
	}
	if !a.Article.IsPaid {
		return article.ErrNotPaid
	}
	if isAuthor(a, buyerUserID) {
		return article.ErrCannotBuyOwn
	}
	purchased, err := i.purchaseRepo.HasPurchased(ctx, articleID, buyerUserID)
	if err != nil {
		return err
	}
	if purchased {
		return article.ErrAlreadyPurchased
	}

	sessionURL, sessionID, err := i.stripe.CreateCheckoutSession(ctx, &a.Article, buyerUserID)
	if err != nil {
		return err
	}

	_, err = i.purchaseRepo.Create(ctx, &article.Purchase{
		ArticleID:       articleID,
		BuyerUserID:     buyerUserID,
		StripeSessionID: sessionID,
		AmountYen:       a.Article.PriceYen,
	})
	if err != nil {
		return err
	}

	return i.output.PresentCheckoutSession(ctx, sessionURL)
}

func isAuthor(a *article.ArticleWithAuthor, userID string) bool {
	return a.Article.AuthorType == article.AuthorTypeUser && a.Article.AuthorUserID != nil && *a.Article.AuthorUserID == userID
}

func isAuthorByType(a *article.ArticleWithAuthor, authorType article.AuthorType, authorID string) bool {
	if a.Article.AuthorType != authorType {
		return false
	}
	switch authorType {
	case article.AuthorTypeUser:
		return a.Article.AuthorUserID != nil && *a.Article.AuthorUserID == authorID
	case article.AuthorTypeCompany:
		return a.Article.AuthorCompanyID != nil && *a.Article.AuthorCompanyID == authorID
	}
	return false
}
