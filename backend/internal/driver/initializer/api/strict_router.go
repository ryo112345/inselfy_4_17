package initializer

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

// strictRouter wraps the Go 1.22 ServeMux that serves the feature groups
// already migrated to strict-server handlers (docs/strict-server-migration.md
// Phase 3). Registered patterns are recorded so spec_drift_test.go can
// enumerate them (ServeMux has no public API for that).
type strictRouter struct {
	mux      *http.ServeMux
	patterns []string
}

func newStrictRouter() *strictRouter {
	return &strictRouter{mux: http.NewServeMux()}
}

// handle registers a "METHOD /path/{param}" pattern on the mux.
//
//nolint:unused // 最初のグループが strict 移行した時点で使用が始まる（Phase 3-1）
func (sr *strictRouter) handle(pattern string, h http.HandlerFunc) {
	sr.mux.HandleFunc(pattern, h)
	sr.patterns = append(sr.patterns, pattern)
}

// dispatchToStrict routes requests matching a migrated strict pattern to the
// mux and lets everything else fall through to the echo router. Running as an
// echo middleware (after Recover / logging / OpenAPI validation / CORS) keeps
// a single middleware chain over both routers until Phase 3-4 removes echo.
func dispatchToStrict(sr *strictRouter) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// c.Request() (not the original *http.Request) carries the
			// validated auth claims the OpenAPI validator middleware put
			// into the request context; strict handlers read them via
			// middleware.*FromContext.
			if _, pattern := sr.mux.Handler(c.Request()); pattern != "" {
				sr.mux.ServeHTTP(c.Response(), c.Request())
				return nil
			}
			return next(c)
		}
	}
}
