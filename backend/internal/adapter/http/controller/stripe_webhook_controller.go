package controller

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/labstack/echo/v4"
	"github.com/stripe/stripe-go/v82"
	"github.com/stripe/stripe-go/v82/webhook"

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

func (c *StripeWebhookController) HandleWebhook(ctx echo.Context) error {
	body, err := io.ReadAll(ctx.Request().Body)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"error": "cannot read body"})
	}

	sig := ctx.Request().Header.Get("Stripe-Signature")
	event, err := webhook.ConstructEvent(body, sig, c.webhookSecret)
	if err != nil {
		return ctx.JSON(http.StatusBadRequest, map[string]string{"error": "invalid signature"})
	}

	switch event.Type {
	case "checkout.session.completed":
		var session stripe.CheckoutSession
		if err := json.Unmarshal(event.Data.Raw, &session); err != nil {
			return ctx.JSON(http.StatusBadRequest, map[string]string{"error": "invalid session data"})
		}
		paymentIntentID := ""
		if session.PaymentIntent != nil {
			paymentIntentID = session.PaymentIntent.ID
		}
		if err := c.purchaseRepo.CompleteBySessionID(ctx.Request().Context(), session.ID, paymentIntentID); err != nil {
			return ctx.JSON(http.StatusInternalServerError, map[string]string{"error": "failed to complete purchase"})
		}
	}

	return ctx.JSON(http.StatusOK, map[string]string{"status": "ok"})
}
