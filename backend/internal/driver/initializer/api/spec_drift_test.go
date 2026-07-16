package initializer

// Detects spec-external routes that nobody accounted for. The spec→router
// direction needs no test since Phase 4: the generated HandlerWithOptions
// registers every spec operation (and StrictServerInterface conformance is
// compile-checked), so only the reverse remains — a route registered by hand
// must either be in the spec or in the unspeccedRoutes allowlist with a
// reason. This test also exercises registerRoutes itself, which panics if a
// pattern is ambiguous on the main mux (see priorityPatterns) or registered
// twice. See docs/strict-server-migration.md Phase 4.

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"testing"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/jackc/pgx/v5/pgxpool"

	sqlcgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc"
	jwtgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/jwt"
	storagegw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/storage"
	openapigen "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/driver/config"
	driverdb "github.com/akiyama/inselfy/backend/internal/driver/db"
)

// Routes that exist on purpose without a spec entry. Keys are
// "METHOD path" on the normalized form ("*" method matches any method,
// a trailing "*" on the path matches by prefix); values say why.
var unspeccedRoutes = map[string]string{
	"GET /healthz":             "liveness probe (C7)",
	"GET /readyz":              "readiness probe (C7)",
	"GET /api/healthz":         "liveness probe via front proxy (C10)",
	"GET /api/readyz":          "readiness probe via front proxy (C10)",
	"GET /api/uploads*":        "static file serving",
	"GET /api/ws":              "websocket upgrade",
	"GET /api/ws/ticket":       "websocket auth ticket",
	"POST /api/stripe/webhook": "contract is Stripe's, verified by signature not by schema",
}

func TestRouterHasNoUnaccountedRoutes(t *testing.T) {
	specRoutes := loadSpecRoutes(t)
	registered := loadRegisteredRoutes(t)

	var extra []string
	for key := range registered {
		if _, ok := specRoutes[key]; ok {
			continue
		}
		if isAllowlisted(key) {
			continue
		}
		extra = append(extra, key)
	}
	sort.Strings(extra)
	for _, key := range extra {
		t.Errorf("registered on the router but not in the spec (add it to the TypeSpec contract, or to unspeccedRoutes with a reason): %s", key)
	}

	// Guards the allowlist itself: an entry whose route disappeared should be
	// deleted, not kept as dead documentation.
	for pattern, reason := range unspeccedRoutes {
		if !anyRegisteredMatches(registered, pattern) {
			t.Errorf("unspeccedRoutes entry %q (%s) matches no registered route; remove it", pattern, reason)
		}
	}
}

func anyRegisteredMatches(registered map[string]struct{}, pattern string) bool {
	for key := range registered {
		method, path, ok := strings.Cut(key, " ")
		if !ok {
			continue
		}
		pMethod, pPath, ok := strings.Cut(pattern, " ")
		if !ok {
			continue
		}
		if pMethod != "*" && pMethod != method {
			continue
		}
		if strings.HasSuffix(pPath, "*") {
			if strings.HasPrefix(path, strings.TrimSuffix(pPath, "*")) {
				return true
			}
		} else if path == pPath {
			return true
		}
	}
	return false
}

// loadSpecRoutes parses the embedded openapi.yaml into normalized
// "METHOD path" keys.
func loadSpecRoutes(t *testing.T) map[string]struct{} {
	t.Helper()
	loader := openapi3.NewLoader()
	doc, err := loader.LoadFromData(openapigen.SpecYAML)
	if err != nil {
		t.Fatalf("parse embedded spec: %v", err)
	}
	routes := make(map[string]struct{})
	for path, item := range doc.Paths.Map() {
		for method := range item.Operations() {
			routes[routeKey(method, path)] = struct{}{}
		}
	}
	if len(routes) == 0 {
		t.Fatal("spec produced zero routes; embedded openapi.yaml is broken")
	}
	return routes
}

// loadRegisteredRoutes builds the real route table via registerRoutes — the
// strict-server mux patterns — and returns normalized "METHOD path" keys.
// The pool is created lazily and no handler runs, so no DB is needed.
func loadRegisteredRoutes(t *testing.T) map[string]struct{} {
	t.Helper()
	ctx := context.Background()
	pool, err := pgxpool.New(ctx, "postgres://drift:test@localhost:5432/drift-test")
	if err != nil {
		t.Fatalf("create lazy pool: %v", err)
	}
	t.Cleanup(pool.Close)

	d := &deps{
		cfg:  &config.Config{}, // InitialAdminEmail empty → no admin seeding, no DB access
		pool: pool,
		tx:   driverdb.NewTxManager(pool),

		jwtService:  jwtgw.NewService("drift-test-secret"),
		fileStorage: storagegw.NewLocal(t.TempDir(), "/api/uploads"),

		userRepo:         sqlcgw.NewUserRepository(pool),
		notificationRepo: sqlcgw.NewNotificationRepository(pool),
		jobPostingRepo:   sqlcgw.NewJobPostingRepository(pool),
		scoutMsgRepo:     sqlcgw.NewScoutMessageRepository(pool),
		convRepo:         sqlcgw.NewConversationRepository(pool),
		msgRepo:          sqlcgw.NewMessageRepository(pool),
		participantRepo:  sqlcgw.NewConversationParticipantRepository(pool),
	}

	sr := newStrictRouter()
	if _, _, err := registerRoutes(ctx, sr, d); err != nil {
		t.Fatalf("registerRoutes: %v", err)
	}

	routes := make(map[string]struct{})
	for _, pattern := range sr.patterns {
		method, path, ok := strings.Cut(pattern, " ")
		if !ok {
			t.Fatalf("strict mux pattern %q lacks a method; register with %q form", pattern, "METHOD /path")
		}
		routes[routeKey(method, path)] = struct{}{}
	}
	return routes
}

// routeKey normalizes a method + path into a comparable key. Path parameter
// names differ between the spec ({userId}) and the router (:id), so every
// parameter segment collapses to "*"; only position and count must agree.
func routeKey(method, path string) string {
	segs := strings.Split(path, "/")
	for i, s := range segs {
		if strings.HasPrefix(s, ":") ||
			(strings.HasPrefix(s, "{") && strings.HasSuffix(s, "}")) {
			segs[i] = "*"
		}
	}
	return fmt.Sprintf("%s %s", strings.ToUpper(method), strings.Join(segs, "/"))
}

func isAllowlisted(key string) bool {
	method, path, ok := strings.Cut(key, " ")
	if !ok {
		return false
	}
	for pattern := range unspeccedRoutes {
		pMethod, pPath, ok := strings.Cut(pattern, " ")
		if !ok {
			continue
		}
		if pMethod != "*" && pMethod != method {
			continue
		}
		if strings.HasSuffix(pPath, "*") {
			if strings.HasPrefix(path, strings.TrimSuffix(pPath, "*")) {
				return true
			}
		} else if path == pPath {
			return true
		}
	}
	return false
}
