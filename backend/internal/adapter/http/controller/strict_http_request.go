package controller

import (
	"context"
	"errors"
	"net/http"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/domain/auth"
)

// strict handler は署名上 *http.Request を受け取らないが、auth 系は
// リクエスト cookie（refresh_token）の読み取りと Secure 属性判定（scheme）に
// リクエストへのアクセスが要る。RequestIntoContext を strict wrapper の
// ミドルウェアとして差し、context 経由で取り出す
// （docs/strict-server-migration.md 3-3 cookie パターン）。

type httpRequestKey struct{}

// RequestIntoContext is a StrictMiddlewareFunc that makes the raw
// *http.Request available to strict handlers via requestFromContext.
func RequestIntoContext(f openapi.StrictHandlerFunc, _ string) openapi.StrictHandlerFunc {
	return func(ctx context.Context, w http.ResponseWriter, r *http.Request, request interface{}) (interface{}, error) {
		return f(context.WithValue(ctx, httpRequestKey{}, r), w, r, request)
	}
}

func requestFromContext(ctx context.Context) *http.Request {
	r, _ := ctx.Value(httpRequestKey{}).(*http.Request)
	return r
}

// cookieValue returns the named request cookie's value ("" 不可) via context.
func cookieValue(ctx context.Context, name string) (string, bool) {
	r := requestFromContext(ctx)
	if r == nil {
		return "", false
	}
	c, err := r.Cookie(name)
	if err != nil || c.Value == "" {
		return "", false
	}
	return c.Value, true
}

// isSecureRequest replicates echo's ctx.Scheme() == "https"（TLS 直終端か、
// プロキシの X-Forwarded-* を見る。Cloud Run は X-Forwarded-Proto を付ける）。
func isSecureRequest(ctx context.Context) bool {
	r := requestFromContext(ctx)
	if r == nil {
		return false
	}
	switch {
	case r.TLS != nil,
		r.Header.Get("X-Forwarded-Proto") == "https",
		r.Header.Get("X-Forwarded-Protocol") == "https",
		r.Header.Get("X-Forwarded-Ssl") == "on",
		r.Header.Get("X-Url-Scheme") == "https":
		return true
	}
	return false
}

func setCookies(w http.ResponseWriter, cookies []*http.Cookie) {
	for _, c := range cookies {
		http.SetCookie(w, c)
	}
}

// unauthorizedBody is the canonical 401 body（echo 版 unauthorized() と同形）.
func unauthorizedBody(message string) openapi.ModelsUnauthorizedError {
	return openapi.ModelsUnauthorizedError{
		Code:    openapi.ModelsUnauthorizedErrorCodeUNAUTHORIZED,
		Message: message,
	}
}

// isUnauthorizedAuthError mirrors the auth-error classification of the echo-era
// handleAuthError: これらは 401、その他は各 handler がステータス分類する。
func isUnauthorizedAuthError(err error) bool {
	return errors.Is(err, auth.ErrInvalidGoogleToken) ||
		errors.Is(err, auth.ErrUnauthorized) ||
		errors.Is(err, auth.ErrTokenExpired) ||
		errors.Is(err, auth.ErrRefreshTokenRevoked)
}
