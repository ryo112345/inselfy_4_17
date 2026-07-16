package initializer

import (
	"github.com/labstack/echo/v4"

	sqlcgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc"
	httpcontroller "github.com/akiyama/inselfy/backend/internal/adapter/http/controller"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

// wireSearch registers the cross-content search routes (users/articles/posts/jobs).
func wireSearch(e *echo.Echo, d *deps) {
	searchCtrl := httpcontroller.NewSearchController(
		usecase.NewSearchInteractor(sqlcgw.NewSearchQueryService(d.pool)),
	)

	searchGroup := e.Group("/api/search")
	searchGroup.GET("", searchCtrl.SearchAll)
	searchGroup.GET("/users", searchCtrl.SearchUsers)
	searchGroup.GET("/articles", searchCtrl.SearchArticles)
	searchGroup.GET("/posts", searchCtrl.SearchPosts)
	searchGroup.GET("/jobs", searchCtrl.SearchJobs)
}
