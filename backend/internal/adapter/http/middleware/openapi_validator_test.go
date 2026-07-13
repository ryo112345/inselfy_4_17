package middleware

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/labstack/echo/v4"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
)

func newValidatedEcho(t *testing.T) *echo.Echo {
	t.Helper()
	mw, err := OpenAPIRequestValidator(openapi.SpecYAML)
	if err != nil {
		t.Fatalf("failed to build validator: %v", err)
	}
	e := echo.New()
	e.Use(mw)
	ok := func(c echo.Context) error { return c.NoContent(http.StatusOK) }
	e.POST("/api/posts", ok)
	e.POST("/api/not-in-spec", ok)
	return e
}

func postJSON(t *testing.T, e *echo.Echo, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequestWithContext(t.Context(), http.MethodPost, path, strings.NewReader(body))
	req.Header.Set(echo.HeaderContentType, echo.MIMEApplicationJSON)
	rec := httptest.NewRecorder()
	e.ServeHTTP(rec, req)
	return rec
}

func TestOpenAPIRequestValidator_ValidBodyPasses(t *testing.T) {
	e := newValidatedEcho(t)
	rec := postJSON(t, e, "/api/posts", `{"content":"hello"}`)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
}

func TestOpenAPIRequestValidator_MaxLengthViolationRejected(t *testing.T) {
	e := newValidatedEcho(t)
	long := strings.Repeat("a", 281)
	rec := postJSON(t, e, "/api/posts", `{"content":"`+long+`"}`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "BAD_REQUEST") {
		t.Fatalf("expected unified error body, got %s", rec.Body.String())
	}
}

func TestOpenAPIRequestValidator_MissingRequiredFieldRejected(t *testing.T) {
	e := newValidatedEcho(t)
	rec := postJSON(t, e, "/api/posts", `{}`)
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
