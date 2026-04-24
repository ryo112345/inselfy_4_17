package stripe

import (
	"context"
	"fmt"

	"github.com/stripe/stripe-go/v82"
	"github.com/stripe/stripe-go/v82/checkout/session"

	"github.com/akiyama/inselfy/backend/internal/domain/article"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type Service struct {
	secretKey string
	baseURL   string
}

var _ port.StripeService = (*Service)(nil)

func NewService(secretKey, baseURL string) *Service {
	stripe.Key = secretKey
	return &Service{secretKey: secretKey, baseURL: baseURL}
}

func (s *Service) CreateCheckoutSession(_ context.Context, a *article.Article, buyerUserID string) (string, string, error) {
	params := &stripe.CheckoutSessionParams{
		Mode: stripe.String(string(stripe.CheckoutSessionModePayment)),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
					Currency: stripe.String("jpy"),
					ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
						Name: stripe.String(a.Title),
					},
					UnitAmount: stripe.Int64(int64(a.PriceYen)),
				},
				Quantity: stripe.Int64(1),
			},
		},
		SuccessURL: stripe.String(fmt.Sprintf("%s/articles/%s?purchased=true", s.baseURL, a.ID)),
		CancelURL:  stripe.String(fmt.Sprintf("%s/articles/%s", s.baseURL, a.ID)),
		Metadata: map[string]string{
			"article_id":    a.ID,
			"buyer_user_id": buyerUserID,
		},
	}

	sess, err := session.New(params)
	if err != nil {
		return "", "", err
	}
	return sess.URL, sess.ID, nil
}
