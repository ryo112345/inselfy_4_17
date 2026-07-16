package initializer

import (
	sqlcgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc"
	httpcontroller "github.com/akiyama/inselfy/backend/internal/adapter/http/controller"
	openapigen "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

// wireSearch registers the cross-content search routes
// (users/articles/posts/jobs) on the strict mux — this group is migrated to
// strict-server handlers (docs/strict-server-migration.md Phase 3-1 グループ3).
func wireSearch(sr *strictRouter, wrapper *openapigen.ServerInterfaceWrapper, ss *httpcontroller.StrictServer, d *deps) {
	ss.WireSearchGroup(httpcontroller.NewSearchController(
		usecase.NewSearchInteractor(sqlcgw.NewSearchQueryService(d.pool)),
	))

	sr.handle("GET /api/search", wrapper.SearchSearchAll)
	sr.handle("GET /api/search/users", wrapper.SearchSearchUsers)
	sr.handle("GET /api/search/articles", wrapper.SearchSearchArticles)
	sr.handle("GET /api/search/posts", wrapper.SearchSearchPosts)
	sr.handle("GET /api/search/jobs", wrapper.SearchSearchJobs)
}
