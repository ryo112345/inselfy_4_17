package middleware

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/labstack/echo/v4"

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

// claims echoes back what the auth layer published, for assertions.
func claimsHandler(c echo.Context) error {
	return c.String(http.StatusOK,
		UserID(c)+"|"+CompanyID(c)+"|"+
			UserIDFromContext(c.Request().Context())+"|"+CompanyIDFromContext(c.Request().Context()))
}

func newValidatedEcho(t *testing.T) *echo.Echo {
	t.Helper()
	mw, err := OpenAPIRequestValidator(openapi.SpecYAML, stubJWTService{})
	if err != nil {
		t.Fatalf("failed to build validator: %v", err)
	}
	e := echo.New()
	e.Use(mw)
	ok := func(c echo.Context) error { return c.NoContent(http.StatusOK) }
	// CandidateAuth required in the spec.
	e.POST("/api/posts", claimsHandler)
	// Optional auth in the spec: security: [{CandidateAuth}, {}].
	e.GET("/api/articles/:articleId", claimsHandler)
	// OR auth in the spec: security: [{CandidateAuth}, {CompanyAuth}].
	e.GET("/api/career-interest/sessions/:sessionId/ai-report", claimsHandler)
	e.POST("/api/not-in-spec", ok)
	return e
}

func doRequest(t *testing.T, e *echo.Echo, req *http.Request) *httptest.ResponseRecorder {
	t.Helper()
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	return rec
}

func postJSON(t *testing.T, e *echo.Echo, path, body string, cookies ...*http.Cookie) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequestWithContext(t.Context(), http.MethodPost, path, strings.NewReader(body))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	for _, cookie := range cookies {
		req.AddCookie(cookie)
	}
	return doRequest(t, e, req)
}

func getPath(t *testing.T, e *echo.Echo, path string, cookies ...*http.Cookie) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequestWithContext(t.Context(), http.MethodGet, path, nil)
	for _, cookie := range cookies {
		req.AddCookie(cookie)
	}
	return doRequest(t, e, req)
}

func candidateCookie(value string) *http.Cookie {
	return &http.Cookie{Name: "inselfy_token", Value: value} //nolint:gosec // G124: リクエスト側 cookie のため属性は無関係
}

func companyCookie(value string) *http.Cookie {
	return &http.Cookie{Name: "company_token", Value: value} //nolint:gosec // G124: リクエスト側 cookie のため属性は無関係
}

func TestOpenAPIRequestValidator_ValidBodyPasses(t *testing.T) {
	e := newValidatedEcho(t)
	rec := postJSON(t, e, "/api/posts", `{"content":"hello"}`, candidateCookie("valid-user-token"))
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if got := rec.Body.String(); got != "user-1||user-1|" {
		t.Fatalf("expected candidate claims in both contexts, got %q", got)
	}
}

func TestOpenAPIRequestValidator_MaxLengthViolationRejected(t *testing.T) {
	e := newValidatedEcho(t)
	long := strings.Repeat("a", 281)
	rec := postJSON(t, e, "/api/posts", `{"content":"`+long+`"}`, candidateCookie("valid-user-token"))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "BAD_REQUEST") {
		t.Fatalf("expected unified error body, got %s", rec.Body.String())
	}
}

func TestOpenAPIRequestValidator_MissingRequiredFieldRejected(t *testing.T) {
	e := newValidatedEcho(t)
	rec := postJSON(t, e, "/api/posts", `{}`, candidateCookie("valid-user-token"))
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestOpenAPIRequestValidator_UnknownPathPassesThrough(t *testing.T) {
	e := newValidatedEcho(t)
	rec := postJSON(t, e, "/api/not-in-spec", `{"whatever": true}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 for path outside spec, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestOpenAPIRequestValidator_MissingTokenRejected(t *testing.T) {
	e := newValidatedEcho(t)
	rec := postJSON(t, e, "/api/posts", `{"content":"hello"}`)
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "UNAUTHORIZED") {
		t.Fatalf("expected unified 401 body, got %s", rec.Body.String())
	}
}

func TestOpenAPIRequestValidator_InvalidTokenRejected(t *testing.T) {
	e := newValidatedEcho(t)
	rec := postJSON(t, e, "/api/posts", `{"content":"hello"}`, candidateCookie("bogus"))
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestOpenAPIRequestValidator_BearerHeaderFallback(t *testing.T) {
	e := newValidatedEcho(t)
	req := httptest.NewRequestWithContext(t.Context(), http.MethodPost, "/api/posts", strings.NewReader(`{"content":"hello"}`))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	req.Header.Set("Authorization", "Bearer valid-user-token")
	rec := doRequest(t, e, req)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 via bearer fallback, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestOpenAPIRequestValidator_OptionalAuthWithoutToken(t *testing.T) {
	e := newValidatedEcho(t)
	rec := getPath(t, e, "/api/articles/00000000-0000-0000-0000-000000000000")
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 on optional-auth route without token, got %d: %s", rec.Code, rec.Body.String())
	}
	if got := rec.Body.String(); got != "|||" {
		t.Fatalf("expected empty claims, got %q", got)
	}
}

func TestOpenAPIRequestValidator_OptionalAuthWithToken(t *testing.T) {
	e := newValidatedEcho(t)
	rec := getPath(t, e, "/api/articles/00000000-0000-0000-0000-000000000000", candidateCookie("valid-user-token"))
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if got := rec.Body.String(); got != "user-1||user-1|" {
		t.Fatalf("expected candidate claims, got %q", got)
	}
}

func TestOpenAPIRequestValidator_OptionalAuthWithInvalidTokenFallsBackToAnonymous(t *testing.T) {
	e := newValidatedEcho(t)
	rec := getPath(t, e, "/api/articles/00000000-0000-0000-0000-000000000000", candidateCookie("bogus"))
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 (empty requirement absorbs the failure), got %d: %s", rec.Code, rec.Body.String())
	}
	if got := rec.Body.String(); got != "|||" {
		t.Fatalf("expected empty claims, got %q", got)
	}
}

func TestOpenAPIRequestValidator_OrAuthAcceptsCompanyToken(t *testing.T) {
	e := newValidatedEcho(t)
	rec := getPath(t, e, "/api/career-interest/sessions/00000000-0000-0000-0000-000000000000/ai-report",
		companyCookie("valid-company-token"))
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200 for company token on OR route, got %d: %s", rec.Code, rec.Body.String())
	}
	if got := rec.Body.String(); got != "|company-1||company-1" {
		t.Fatalf("expected company claims, got %q", got)
	}
}

func TestOpenAPIRequestValidator_OrAuthRejectsWithoutAnyToken(t *testing.T) {
	e := newValidatedEcho(t)
	rec := getPath(t, e, "/api/career-interest/sessions/00000000-0000-0000-0000-000000000000/ai-report")
	if rec.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401 on OR route without token, got %d: %s", rec.Code, rec.Body.String())
	}
}
