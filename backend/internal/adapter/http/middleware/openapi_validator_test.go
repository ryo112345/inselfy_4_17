package middleware

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
)

// stubJWTService recognizes exactly one candidate and one company token.
type stubJWTService struct{}

func (stubJWTService) GenerateAccessToken(string) (string, error)        { return "", nil }
func (stubJWTService) GenerateCompanyAccessToken(string) (string, error) { return "", nil }
func (stubJWTService) GenerateRefreshToken() (string, error)             { return "", nil }
func (stubJWTService) HashRefreshToken(token string) string              { return token }

func (stubJWTService) ValidateAccessToken(token string) (string, error) {
	if token == "valid-user-token" {
		return "user-1", nil
	}
	return "", errors.New("invalid token")
}

func (stubJWTService) ValidateCompanyAccessToken(token string) (string, error) {
	if token == "valid-company-token" {
		return "company-1", nil
	}
	return "", errors.New("invalid token")
}

// claimsHandler echoes back what the auth layer published, for assertions.
func claimsHandler(w http.ResponseWriter, r *http.Request) {
	_, _ = w.Write([]byte(UserIDFromContext(r.Context()) + "|" + CompanyIDFromContext(r.Context())))
}

// testAdminStaticKey is the ADMIN_API_KEY equivalent for tests. The personal
// token path needs a live DB, so the pool below points at an unreachable
// host: any non-static key deterministically fails the lookup (→ 401).
const testAdminStaticKey = "test-admin-static-key"

func newValidatedHandler(t *testing.T) http.Handler {
	t.Helper()
	pool, err := pgxpool.New(t.Context(), "postgres://validator:test@invalid-host.invalid:5432/validator-test")
	if err != nil {
		t.Fatalf("failed to create lazy pool: %v", err)
	}
	t.Cleanup(pool.Close)
	mw, err := OpenAPIRequestValidator(openapi.SpecYAML, stubJWTService{}, pool, testAdminStaticKey)
	if err != nil {
		t.Fatalf("failed to build validator: %v", err)
	}
	mux := http.NewServeMux()
	ok := func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusOK) }
	// CandidateAuth required in the spec.
	mux.HandleFunc("POST /api/posts", claimsHandler)
	// Optional auth in the spec: security: [{CandidateAuth}, {}].
	mux.HandleFunc("GET /api/articles/{articleId}", claimsHandler)
	// OR auth in the spec: security: [{CandidateAuth}, {CompanyAuth}].
	mux.HandleFunc("GET /api/career-interest/sessions/{sessionId}/ai-report", claimsHandler)
	// AdminAuth (X-Admin-Key) required in the spec.
	mux.HandleFunc("GET /api/admin/reports/pending", ok)
	mux.HandleFunc("POST /api/not-in-spec", ok)
	return mw(mux)
}

func doRequest(t *testing.T, h http.Handler, req *http.Request) *httptest.ResponseRecorder {
	t.Helper()
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	return rec
}

func postJSON(t *testing.T, h http.Handler, path, body string, cookies ...*http.Cookie) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequestWithContext(t.Context(), http.MethodPost, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	for _, cookie := range cookies {
		req.AddCookie(cookie)
	}
	return doRequest(t, h, req)
}

func getPath(t *testing.T, h http.Handler, path string, cookies ...*http.Cookie) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequestWithContext(t.Context(), http.MethodGet, path, nil)
	for _, cookie := range cookies {
		req.AddCookie(cookie)
	}
	return doRequest(t, h, req)
}

func candidateCookie(value string) *http.Cookie {
	return &http.Cookie{Name: "inselfy_token", Value: value} //nolint:gosec // G124: リクエスト側 cookie のため属性は無関係
}

func companyCookie(value string) *http.Cookie {
	return &http.Cookie{Name: "company_token", Value: value} //nolint:gosec // G124: リクエスト側 cookie のため属性は無関係
}

func TestOpenAPIRequestValidator_ValidBodyPasses(t *testing.T) {
	h := newValidatedHandler(t)
	rec := postJSON(t, h, "/api/posts", `{"content":"hello"}`, candidateCookie("valid-user-token"))
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if got := rec.Body.String(); got != "user-1|" {
		t.Fatalf("expected candidate claims in request context, got %q", got)
	}
}

func TestOpenAPIRequestValidator_MaxLengthViolationRejected(t *testing.T) {
	h := newValidatedHandler(t)
	long := strings.Repeat("a", 281)
	rec := postJSON(t, h, "/api/posts", `{"content":"`+long+`"}`, candidateCookie("valid-user-token"))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "BAD_REQUEST") {
		t.Fatalf("expected unified error body, got %s", rec.Body.String())
	}
}

func TestOpenAPIRequestValidator_MissingRequiredFieldRejected(t *testing.T) {
	h := newValidatedHandler(t)
	rec := postJSON(t, h, "/api/posts", `{}`, candidateCookie("valid-user-token"))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestOpenAPIRequestValidator_UnknownPathPassesThrough(t *testing.T) {
	h := newValidatedHandler(t)
	rec := postJSON(t, h, "/api/not-in-spec", `{"whatever": true}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 for path outside spec, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestOpenAPIRequestValidator_MissingTokenRejected(t *testing.T) {
	h := newValidatedHandler(t)
	rec := postJSON(t, h, "/api/posts", `{"content":"hello"}`)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "UNAUTHORIZED") {
		t.Fatalf("expected unified 401 body, got %s", rec.Body.String())
	}
}

func TestOpenAPIRequestValidator_InvalidTokenRejected(t *testing.T) {
	h := newValidatedHandler(t)
	rec := postJSON(t, h, "/api/posts", `{"content":"hello"}`, candidateCookie("bogus"))
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestOpenAPIRequestValidator_BearerHeaderFallback(t *testing.T) {
	h := newValidatedHandler(t)
	req := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/api/posts", strings.NewReader(`{"content":"hello"}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer valid-user-token")
	rec := doRequest(t, h, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 via bearer fallback, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestOpenAPIRequestValidator_OptionalAuthWithoutToken(t *testing.T) {
	h := newValidatedHandler(t)
	rec := getPath(t, h, "/api/articles/00000000-0000-0000-0000-000000000000")
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 on optional-auth route without token, got %d: %s", rec.Code, rec.Body.String())
	}
	if got := rec.Body.String(); got != "|" {
		t.Fatalf("expected empty claims, got %q", got)
	}
}

func TestOpenAPIRequestValidator_OptionalAuthWithToken(t *testing.T) {
	h := newValidatedHandler(t)
	rec := getPath(t, h, "/api/articles/00000000-0000-0000-0000-000000000000", candidateCookie("valid-user-token"))
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if got := rec.Body.String(); got != "user-1|" {
		t.Fatalf("expected candidate claims, got %q", got)
	}
}

func TestOpenAPIRequestValidator_OptionalAuthWithInvalidTokenFallsBackToAnonymous(t *testing.T) {
	h := newValidatedHandler(t)
	rec := getPath(t, h, "/api/articles/00000000-0000-0000-0000-000000000000", candidateCookie("bogus"))
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 (empty requirement absorbs the failure), got %d: %s", rec.Code, rec.Body.String())
	}
	if got := rec.Body.String(); got != "|" {
		t.Fatalf("expected empty claims, got %q", got)
	}
}

func TestOpenAPIRequestValidator_OrAuthAcceptsCompanyToken(t *testing.T) {
	h := newValidatedHandler(t)
	rec := getPath(t, h, "/api/career-interest/sessions/00000000-0000-0000-0000-000000000000/ai-report",
		companyCookie("valid-company-token"))
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 for company token on OR route, got %d: %s", rec.Code, rec.Body.String())
	}
	if got := rec.Body.String(); got != "|company-1" {
		t.Fatalf("expected company claims, got %q", got)
	}
}

func TestOpenAPIRequestValidator_OrAuthRejectsWithoutAnyToken(t *testing.T) {
	h := newValidatedHandler(t)
	rec := getPath(t, h, "/api/career-interest/sessions/00000000-0000-0000-0000-000000000000/ai-report")
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 on OR route without token, got %d: %s", rec.Code, rec.Body.String())
	}
}

func adminGet(t *testing.T, h http.Handler, key string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/api/admin/reports/pending", nil)
	if key != "" {
		req.Header.Set("X-Admin-Key", key)
	}
	return doRequest(t, h, req)
}

func TestOpenAPIRequestValidator_AdminStaticKeyPasses(t *testing.T) {
	h := newValidatedHandler(t)
	rec := adminGet(t, h, testAdminStaticKey)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 with static admin key, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestOpenAPIRequestValidator_AdminMissingKeyRejected(t *testing.T) {
	h := newValidatedHandler(t)
	rec := adminGet(t, h, "")
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 without X-Admin-Key, got %d: %s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "UNAUTHORIZED") {
		t.Fatalf("expected unified 401 body, got %s", rec.Body.String())
	}
}

func TestOpenAPIRequestValidator_AdminWrongKeyRejected(t *testing.T) {
	h := newValidatedHandler(t)
	rec := adminGet(t, h, "wrong-key")
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 with wrong admin key, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestOpenAPIRequestValidator_AdminBearerFallbackNotAccepted(t *testing.T) {
	// X-Admin-Key は header スキームなので Authorization: Bearer では代替できない
	// （旧 AdminAuth ミドルウェアと同じ挙動）。
	h := newValidatedHandler(t)
	req := httptest.NewRequestWithContext(t.Context(), http.MethodGet, "/api/admin/reports/pending", nil)
	req.Header.Set("Authorization", "Bearer "+testAdminStaticKey)
	rec := doRequest(t, h, req)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 for bearer-only admin request, got %d: %s", rec.Code, rec.Body.String())
	}
}
