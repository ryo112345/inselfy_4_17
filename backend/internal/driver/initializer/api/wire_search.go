package initializer

import (
	sqlcgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc"
	httpcontroller "github.com/akiyama/inselfy/backend/internal/adapter/http/controller"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

// wireSearch assembles the cross-content search controller
// (users/articles/posts/jobs).
func wireSearch(ss *httpcontroller.StrictServer, d *deps) {
	ss.WireSearchGroup(httpcontroller.NewSearchController(
		usecase.NewSearchInteractor(sqlcgw.NewSearchQueryService(d.pool)),
	))
}
