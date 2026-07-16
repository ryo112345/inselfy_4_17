package initializer

import (
	"github.com/labstack/echo/v4"

	sqlcgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc"
	stripegw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/stripe"
	httpcontroller "github.com/akiyama/inselfy/backend/internal/adapter/http/controller"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

// wireContent registers content routes: articles (user- and company-authored),
// the Stripe purchase webhook, and posts (timeline).
func wireContent(e *echo.Echo, d *deps) {
	stripeService := stripegw.NewService(d.cfg.StripeSecretKey, d.cfg.AppURL)
	articleCtrl := httpcontroller.NewArticleController(
		usecase.NewArticleInteractor(
			sqlcgw.NewArticleRepository(d.pool), sqlcgw.NewArticlePurchaseRepository(d.pool), stripeService,
		),
		d.fileStorage,
	)
	postCtrl := httpcontroller.NewPostController(usecase.NewPostInteractor(sqlcgw.NewPostRepository(d.pool)))

	// --- Articles (public) ---
	articleGroup := e.Group("/api/articles")
	articleGroup.GET("", articleCtrl.List)
	articleGroup.GET("/:articleId", func(c echo.Context) error {
		return articleCtrl.GetByID(c, c.Param("articleId"))
	})

	// --- Articles (user-authored) ---
	articleGroup.GET("/mine", articleCtrl.ListMine)
	articleGroup.POST("/upload-image", articleCtrl.UploadImage)
	articleGroup.POST("", articleCtrl.CreateAsUser)
	articleGroup.PUT("/:articleId", func(c echo.Context) error {
		return articleCtrl.UpdateAsUser(c, c.Param("articleId"))
	})
	articleGroup.DELETE("/:articleId", func(c echo.Context) error {
		return articleCtrl.DeleteAsUser(c, c.Param("articleId"))
	})
	articleGroup.POST("/:articleId/publish", func(c echo.Context) error {
		return articleCtrl.PublishAsUser(c, c.Param("articleId"))
	})
	articleGroup.POST("/:articleId/checkout", func(c echo.Context) error {
		return articleCtrl.CreateCheckout(c, c.Param("articleId"))
	})

	// --- Articles (company-authored) ---
	companyArticleGroup := e.Group("/api/company/articles")
	companyArticleGroup.POST("", articleCtrl.CreateAsCompany)
	companyArticleGroup.PUT("/:articleId", func(c echo.Context) error {
		return articleCtrl.UpdateAsCompany(c, c.Param("articleId"))
	})
	companyArticleGroup.DELETE("/:articleId", func(c echo.Context) error {
		return articleCtrl.DeleteAsCompany(c, c.Param("articleId"))
	})
	companyArticleGroup.POST("/:articleId/publish", func(c echo.Context) error {
		return articleCtrl.PublishAsCompany(c, c.Param("articleId"))
	})

	// --- Stripe Webhook ---
	stripeWebhookCtrl := httpcontroller.NewStripeWebhookController(
		sqlcgw.NewArticlePurchaseRepository(d.pool),
		d.cfg.StripeWebhookSecret,
	)
	e.POST("/api/stripe/webhook", stripeWebhookCtrl.HandleWebhook)

	// --- Posts ---
	postGroup := e.Group("/api/posts")
	postGroup.POST("", postCtrl.Create)
	postGroup.GET("", postCtrl.ListTimeline)
	postGroup.GET("/users/:userId", func(c echo.Context) error {
		return postCtrl.ListByUserID(c, c.Param("userId"))
	})
	postGroup.GET("/users/:userId/likes", func(c echo.Context) error {
		return postCtrl.ListLikedByUserID(c, c.Param("userId"))
	})
	postGroup.GET("/:postId", func(c echo.Context) error {
		return postCtrl.GetByID(c, c.Param("postId"))
	})
	postGroup.DELETE("/:postId", func(c echo.Context) error {
		return postCtrl.Delete(c, c.Param("postId"))
	})
	postGroup.POST("/:postId/like", func(c echo.Context) error {
		return postCtrl.ToggleLike(c, c.Param("postId"))
	})
	postGroup.POST("/:postId/repost", func(c echo.Context) error {
		return postCtrl.ToggleRepost(c, c.Param("postId"))
	})
	postGroup.GET("/:postId/comments", func(c echo.Context) error {
		return postCtrl.ListComments(c, c.Param("postId"))
	})
	postGroup.POST("/:postId/comments", func(c echo.Context) error {
		return postCtrl.CreateComment(c, c.Param("postId"))
	})
	postGroup.DELETE("/comments/:commentId", func(c echo.Context) error {
		return postCtrl.DeleteComment(c, c.Param("commentId"))
	})
}
