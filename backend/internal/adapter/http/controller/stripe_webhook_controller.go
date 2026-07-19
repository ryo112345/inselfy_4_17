package controller

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/stripe/stripe-go/v82"
	"github.com/stripe/stripe-go/v82/webhook"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type StripeWebhookController struct {
	purchaseRepo  port.ArticlePurchaseRepository
	webhookSecret string
}

func NewStripeWebhookController(
	purchaseRepo port.ArticlePurchaseRepository,
	webhookSecret string,
) *StripeWebhookController {
	return &StripeWebhookController{
		purchaseRepo:  purchaseRepo,
		webhookSecret: webhookSecret,
	}
}

func (c *StripeWebhookController) HandleWebhook(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(r.Body)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, badRequestBody("cannot read body"))
		return
	}

	sig := r.Header.Get("Stripe-Signature")
	event, err := webhook.ConstructEvent(body, sig, c.webhookSecret)
	if err != nil {
		writeJSON(w, http.StatusBadRequest, badRequestBody("invalid signature"))
		return
	}

	switch event.Type {
	case "checkout.session.completed":
		var session stripe.CheckoutSession
		if err := json.Unmarshal(event.Data.Raw, &session); err != nil {
			writeJSON(w, http.StatusBadRequest, badRequestBody("invalid session data"))
			return
		}
		paymentIntentID := ""
		if session.PaymentIntent != nil {
			paymentIntentID = session.PaymentIntent.ID
		}
		if err := c.purchaseRepo.CompleteBySessionID(r.Context(), session.ID, paymentIntentID); err != nil {
			writeJSON(w, http.StatusInternalServerError,
				openapi.ModelsErrorResponse{Code: "INTERNAL", Message: "failed to complete purchase"})
			return
		}
	default:
		// 購読していないイベントは 200 を返して無視する
	}

	writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}
