package middleware

import (
	"bytes"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/jackc/pgx/v5/pgxpool"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/driver/logging"
)

// newResponseValidatedHandler builds the validator with response validation
// on, serving GET /api/messages/unread-count (spec: 200 = {count: int32},
// CandidateAuth) with whatever status/body the test injects.
func newResponseValidatedHandler(t *testing.T, status int, body string) http.Handler {
	t.Helper()
	pool, err := pgxpool.New(t.Context(), "postgres://validator:test@invalid-host.invalid:5432/validator-test")
	if err != nil {
		t.Fatalf("failed to create lazy pool: %v", err)
	}
	t.Cleanup(pool.Close)
	mw, err := OpenAPIRequestValidator(openapi.SpecYAML, stubJWTService{}, pool, testAdminStaticKey, true)
	if err != nil {
		t.Fatalf("failed to build validator: %v", err)
	}
	mux := http.NewServeMux()
	mux.HandleFunc("GET /api/messages/unread-count", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(status)
		_, _ = w.Write([]byte(body))
	})
	return mw(mux)
}

// getWithLogCapture performs the request with a request-scoped logger whose
// output the test can inspect for the violation line.
func getWithLogCapture(t *testing.T, h http.Handler) (*httptest.ResponseRecorder, *bytes.Buffer) {
	t.Helper()
	logBuf := &bytes.Buffer{}
	logger := slog.New(slog.NewTextHandler(logBuf, nil))
	ctx := logging.WithLogger(t.Context(), logger)
	req := httptest.NewRequestWithContext(ctx, http.MethodGet, "/api/messages/unread-count", nil)
	req.AddCookie(candidateCookie("valid-user-token"))
	return doRequest(t, h, req), logBuf
}

func TestResponseValidation_ValidResponseNotFlagged(t *testing.T) {
	h := newResponseValidatedHandler(t, http.StatusOK, `{"count":3}`)
	rec, logBuf := getWithLogCapture(t, h)
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}
	if got := strings.TrimSpace(rec.Body.String()); got != `{"count":3}` {
		t.Fatalf("expected body to pass through unchanged, got %q", got)
	}
	if strings.Contains(logBuf.String(), "response contract violation") {
		t.Fatalf("valid response was flagged: %s", logBuf.String())
	}
}

func TestResponseValidation_SchemaViolationLoggedAndPassedThrough(t *testing.T) {
	h := newResponseValidatedHandler(t, http.StatusOK, `{"count":"three"}`)
	rec, logBuf := getWithLogCapture(t, h)
	// 検証は観測のみ: 違反レスポンスもそのままクライアントへ届く
	if rec.Code != http.StatusOK {
		t.Fatalf("expected violating response to pass through with 200, got %d", rec.Code)
	}
	if got := strings.TrimSpace(rec.Body.String()); got != `{"count":"three"}` {
		t.Fatalf("expected body to pass through unchanged, got %q", got)
	}
	if !strings.Contains(logBuf.String(), "response contract violation") {
		t.Fatalf("expected a violation log for schema mismatch, got: %s", logBuf.String())
	}
}

func TestResponseValidation_UndeclaredStatusLogged(t *testing.T) {
	h := newResponseValidatedHandler(t, http.StatusTeapot, `{"count":1}`)
	rec, logBuf := getWithLogCapture(t, h)
	if rec.Code != http.StatusTeapot {
		t.Fatalf("expected 418 to pass through, got %d", rec.Code)
	}
	if !strings.Contains(logBuf.String(), "response contract violation") {
		t.Fatalf("expected a violation log for undeclared status, got: %s", logBuf.String())
	}
}
