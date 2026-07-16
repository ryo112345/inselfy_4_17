package initializer

import (
	"net/http"

	"github.com/labstack/echo/v4"
)

// strictRouter wraps the Go 1.22 ServeMux that serves the feature groups
// already migrated to strict-server handlers (docs/strict-server-migration.md
// Phase 3). Registered patterns are recorded so spec_drift_test.go can
// enumerate them (ServeMux has no public API for that).
//
// It is two-tiered: ServeMux has no "static segment beats wildcard" rule and
// panics on patterns like GET /api/users/id/{id} vs
// GET /api/users/{username}/experiences ("/api/users/id/experiences" matches
// both). echo resolved these statically-prefixed routes first, so routes that
// would conflict on the main mux go onto the priority mux, which is consulted
// first.
type strictRouter struct {
	priority *http.ServeMux
	mux      *http.ServeMux
	patterns []string
}

func newStrictRouter() *strictRouter {
	return &strictRouter{priority: http.NewServeMux(), mux: http.NewServeMux()}
}

// handle registers a "METHOD /path/{param}" pattern on the main mux.
func (sr *strictRouter) handle(pattern string, h http.HandlerFunc) {
	sr.mux.HandleFunc(pattern, h)
	sr.patterns = append(sr.patterns, pattern)
}

// handleFirst registers a pattern on the priority mux: use it for routes a
// plain ServeMux would reject as ambiguous against a wildcard sibling
// (echo's static-over-param precedence).
func (sr *strictRouter) handleFirst(pattern string, h http.HandlerFunc) {
	sr.priority.HandleFunc(pattern, h)
	sr.patterns = append(sr.patterns, pattern)
}

// match returns the handler serving req, or nil if no strict route matches.
func (sr *strictRouter) match(req *http.Request) http.Handler {
	if _, pattern := sr.priority.Handler(req); pattern != "" {
		return sr.priority
	}
	if _, pattern := sr.mux.Handler(req); pattern != "" {
		return sr.mux
	}
	return nil
}

// dispatchToStrict routes requests matching a migrated strict pattern to the
// strict router and lets everything else fall through to the echo router.
// Running as an echo middleware (after Recover / logging / OpenAPI validation
// / CORS) keeps a single middleware chain over both routers until Phase 3-4
// removes echo.
func dispatchToStrict(sr *strictRouter) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			// c.Request() (not the original *http.Request) carries the
			// validated auth claims the OpenAPI validator middleware put
			// into the request context; strict handlers read them via
			// middleware.*FromContext.
			if h := sr.match(c.Request()); h != nil {
				h.ServeHTTP(c.Response(), c.Request())
				return nil
			}
			return next(c)
		}
	}
}
