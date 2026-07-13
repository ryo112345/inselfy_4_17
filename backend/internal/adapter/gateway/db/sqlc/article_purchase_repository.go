package sqlc

import (
	"context"

	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
	"github.com/akiyama/inselfy/backend/internal/domain/article"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/pkg/cast"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type ArticlePurchaseRepository struct {
	queries *generated.Queries
}

var _ port.ArticlePurchaseRepository = (*ArticlePurchaseRepository)(nil)

func NewArticlePurchaseRepository(pool *pgxpool.Pool) *ArticlePurchaseRepository {
	return &ArticlePurchaseRepository{queries: generated.New(pool)}
}

func (r *ArticlePurchaseRepository) Create(ctx context.Context, p *article.Purchase) (*article.Purchase, error) {
	q := queriesForContext(ctx, r.queries)
	articleID, err := parseUUID(p.ArticleID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	buyerID, err := parseUUID(p.BuyerUserID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	row, err := q.CreateArticlePurchase(ctx, &generated.CreateArticlePurchaseParams{
		ArticleID:       articleID,
		BuyerUserID:     buyerID,
		StripeSessionID: p.StripeSessionID,
		AmountYen:       cast.Int32(p.AmountYen),
	})
	if err != nil {
		return nil, err
	}
	return toDomainPurchase(row), nil
}

func (r *ArticlePurchaseRepository) HasPurchased(ctx context.Context, articleID, buyerUserID string) (bool, error) {
	q := queriesForContext(ctx, r.queries)
	aID, err := parseUUID(articleID)
	if err != nil {
		return false, nil //nolint:nilerr // 不正な ID は「未購入」として扱う仕様
	}
	bID, err := parseUUID(buyerUserID)
	if err != nil {
		return false, nil //nolint:nilerr // 不正な ID は「未購入」として扱う仕様
	}
	return q.HasPurchasedArticle(ctx, &generated.HasPurchasedArticleParams{
		ArticleID:   aID,
		BuyerUserID: bID,
	})
}

func (r *ArticlePurchaseRepository) CompleteBySessionID(ctx context.Context, stripeSessionID string, paymentIntentID string) error {
	q := queriesForContext(ctx, r.queries)
	return q.CompletePurchaseBySessionID(ctx, &generated.CompletePurchaseBySessionIDParams{
		StripeSessionID:       stripeSessionID,
		StripePaymentIntentID: pgtype.Text{String: paymentIntentID, Valid: paymentIntentID != ""},
	})
}

func toDomainPurchase(row *generated.ArticlePurchase) *article.Purchase {
	return &article.Purchase{
		ID:                    uuidToString(row.ID),
		ArticleID:             uuidToString(row.ArticleID),
		BuyerUserID:           uuidToString(row.BuyerUserID),
		StripeSessionID:       row.StripeSessionID,
		StripePaymentIntentID: textPtr(row.StripePaymentIntentID),
		AmountYen:             int(row.AmountYen),
		Status:                row.Status,
		CreatedAt:             row.CreatedAt.Time,
	}
}
