package initializer

import (
	sqlcgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc"
	stripegw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/stripe"
	httpcontroller "github.com/akiyama/inselfy/backend/internal/adapter/http/controller"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

// wireContent assembles the content controllers: articles (user- and
// company-authored) and posts (timeline). The Stripe purchase webhook is
// spec-external (decision 5): a plain hand-written net/http handler,
// verified by signature instead of by schema, so it is registered here.
func wireContent(sr *strictRouter, ss *httpcontroller.StrictServer, d *deps) {
	stripeService := stripegw.NewService(d.cfg.StripeSecretKey, d.cfg.AppURL)
	ss.WireContentGroup(
		httpcontroller.NewPostController(usecase.NewPostInteractor(sqlcgw.NewPostRepository(d.pool))),
		httpcontroller.NewArticleController(
			usecase.NewArticleInteractor(
				sqlcgw.NewArticleRepository(d.pool), sqlcgw.NewArticlePurchaseRepository(d.pool), stripeService,
			),
			d.fileStorage,
		),
	)

	// --- Stripe Webhook（スペック外） ---
	stripeWebhookCtrl := httpcontroller.NewStripeWebhookController(
		sqlcgw.NewArticlePurchaseRepository(d.pool),
		d.cfg.StripeWebhookSecret,
	)
	sr.handle("POST /api/stripe/webhook", stripeWebhookCtrl.HandleWebhook)
}
