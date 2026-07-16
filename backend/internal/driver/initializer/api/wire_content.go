package initializer

import (
	"github.com/labstack/echo/v4"

	sqlcgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc"
	stripegw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/stripe"
	httpcontroller "github.com/akiyama/inselfy/backend/internal/adapter/http/controller"
	openapigen "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

// wireContent registers content routes: articles (user- and company-authored)
// and posts (timeline) on the strict mux — this group is migrated to
// strict-server handlers (docs/strict-server-migration.md Phase 3-1 グループ2).
// The Stripe purchase webhook is spec-external (decision 5) and stays on echo.
func wireContent(e *echo.Echo, sr *strictRouter, wrapper *openapigen.ServerInterfaceWrapper, ss *httpcontroller.StrictServer, d *deps) {
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

	// --- Articles (public + user-authored) ---
	sr.handle("GET /api/articles", wrapper.ArticlesListArticles)
	sr.handle("POST /api/articles", wrapper.ArticlesCreateArticle)
	// /api/articles/mine と /api/articles/{articleId} は「mine がリテラルで
	// より specific」なので ServeMux が静的優先で解決できる（2段 mux 不要。
	// /api/users/id/* のような登録時 panic になる組み合わせは無い）。
	sr.handle("GET /api/articles/mine", wrapper.ArticlesListMyArticles)
	sr.handle("POST /api/articles/upload-image", wrapper.ArticlesUploadArticleImage)
	sr.handle("GET /api/articles/{articleId}", wrapper.ArticlesGetArticle)
	sr.handle("PUT /api/articles/{articleId}", wrapper.ArticlesUpdateArticle)
	sr.handle("DELETE /api/articles/{articleId}", wrapper.ArticlesDeleteArticle)
	sr.handle("POST /api/articles/{articleId}/publish", wrapper.ArticlesPublishArticle)
	sr.handle("POST /api/articles/{articleId}/checkout", wrapper.ArticlesCreateArticleCheckout)

	// --- Articles (company-authored) ---
	sr.handle("POST /api/company/articles", wrapper.CompanyArticlesCreateCompanyArticle)
	sr.handle("PUT /api/company/articles/{articleId}", wrapper.CompanyArticlesUpdateCompanyArticle)
	sr.handle("DELETE /api/company/articles/{articleId}", wrapper.CompanyArticlesDeleteCompanyArticle)
	sr.handle("POST /api/company/articles/{articleId}/publish", wrapper.CompanyArticlesPublishCompanyArticle)

	// --- Stripe Webhook（スペック外・echo 残置） ---
	stripeWebhookCtrl := httpcontroller.NewStripeWebhookController(
		sqlcgw.NewArticlePurchaseRepository(d.pool),
		d.cfg.StripeWebhookSecret,
	)
	e.POST("/api/stripe/webhook", stripeWebhookCtrl.HandleWebhook)

	// --- Posts ---
	sr.handle("POST /api/posts", wrapper.PostsCreatePost)
	sr.handle("GET /api/posts", wrapper.PostsListTimelinePosts)
	// /api/posts/users/{userId} は {postId}/comments 系と ServeMux 上は曖昧に
	// なる（/api/posts/users/comments が両方にマッチ）ため priority mux へ
	// （echo の static-over-param 優先の再現）。
	sr.handleFirst("GET /api/posts/users/{userId}", wrapper.PostsListPostsByUser)
	sr.handle("GET /api/posts/users/{userId}/likes", wrapper.PostsListLikedPostsByUser)
	sr.handle("GET /api/posts/{postId}", wrapper.PostsGetPost)
	sr.handle("DELETE /api/posts/{postId}", wrapper.PostsDeletePost)
	sr.handle("POST /api/posts/{postId}/like", wrapper.PostsTogglePostLike)
	sr.handle("POST /api/posts/{postId}/repost", wrapper.PostsTogglePostRepost)
	sr.handle("GET /api/posts/{postId}/comments", wrapper.PostsListPostComments)
	sr.handle("POST /api/posts/{postId}/comments", wrapper.PostsCreatePostComment)
	sr.handle("DELETE /api/posts/comments/{commentId}", wrapper.PostsDeletePostComment)
}
