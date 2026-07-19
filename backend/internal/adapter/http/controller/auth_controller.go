package controller

import (
	"context"
	"net/http"
	"net/url"
	"time"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type AuthController struct {
	input port.AuthInputPort
}

func NewAuthController(input port.AuthInputPort) *AuthController {
	return &AuthController{input: input}
}

// GoogleLogin handles POST /api/auth/google.
// idToken の長さは上流の OpenAPI validator（minLength/maxLength）が検査するが、
// 従来の controller チェックも防御として維持する。
func (c *AuthController) GoogleLogin(ctx context.Context, req openapi.AuthGoogleLoginRequestObject) (openapi.AuthGoogleLoginResponseObject, error) {
	if req.Body == nil || req.Body.IdToken == "" || len(req.Body.IdToken) > 10000 {
		return openapi.AuthGoogleLogin400JSONResponse(badRequestBody("invalid request")), nil
	}

	pair, u, err := c.input.GoogleLogin(ctx, req.Body.IdToken)
	if err != nil {
		if isUnauthorizedAuthError(err) {
			return openapi.AuthGoogleLogin401JSONResponse(unauthorizedBody("unauthorized")), nil
		}
		return nil, err
	}
	tokenResp := presenter.AuthTokenPairResponse(pair, u).(*presenter.AuthTokenResponse)
	return googleLoginWithCookies{
		inner:   openapi.AuthGoogleLogin200JSONResponse(*tokenResp.User),
		cookies: authCookies(isSecureRequest(ctx), tokenResp),
	}, nil
}

// Refresh handles POST /api/auth/refresh. refresh_token cookie は
// RequestObject に現れないため、context 経由の *http.Request から読む。
func (c *AuthController) Refresh(ctx context.Context, _ openapi.AuthRefreshTokenRequestObject) (openapi.AuthRefreshTokenResponseObject, error) {
	secure := isSecureRequest(ctx)
	value, ok := cookieValue(ctx, "refresh_token")
	if !ok {
		return openapi.AuthRefreshToken401JSONResponse(unauthorizedBody("unauthorized")), nil
	}

	pair, u, err := c.input.RefreshToken(ctx, value)
	if err != nil {
		if isUnauthorizedAuthError(err) {
			return authRefreshWithCookies{
				inner:   openapi.AuthRefreshToken401JSONResponse(unauthorizedBody("unauthorized")),
				cookies: clearedAuthCookies(secure),
			}, nil
		}
		return nil, err
	}
	tokenResp := presenter.AuthTokenPairResponse(pair, u).(*presenter.AuthTokenResponse)
	return authRefreshWithCookies{
		inner:   openapi.AuthRefreshToken200JSONResponse(*tokenResp.User),
		cookies: authCookies(secure, tokenResp),
	}, nil
}

// GetMe handles GET /api/auth/me.
func (c *AuthController) GetMe(ctx context.Context, _ openapi.AuthGetMeRequestObject) (openapi.AuthGetMeResponseObject, error) {
	userID := authmw.UserIDFromContext(ctx)

	u, err := c.input.GetCurrentUser(ctx, userID)
	if err != nil {
		if errorStatus(err) == http.StatusNotFound {
			return openapi.AuthGetMe404JSONResponse(notFoundBody(err)), nil
		}
		return nil, err
	}
	return openapi.AuthGetMe200JSONResponse(*presenter.AuthMeResponse(u).(*openapi.ModelsAuthUserResponse)), nil
}

// Logout handles POST /api/auth/logout.
func (c *AuthController) Logout(ctx context.Context, _ openapi.AuthLogoutRequestObject) (openapi.AuthLogoutResponseObject, error) {
	return authLogoutWithCookies{
		inner:   openapi.AuthLogout204Response{},
		cookies: clearedAuthCookies(isSecureRequest(ctx)),
	}, nil
}

// --- cookie 焼き込み用 Visitor ラッパー（docs/strict-server-migration.md 3-3） ---
// Visit メソッド名が operation ごとに異なるため個別に書く（reflection には走らない）。

type googleLoginWithCookies struct {
	inner   openapi.AuthGoogleLoginResponseObject
	cookies []*http.Cookie
}

func (r googleLoginWithCookies) VisitAuthGoogleLoginResponse(w http.ResponseWriter) error {
	setCookies(w, r.cookies)
	return r.inner.VisitAuthGoogleLoginResponse(w)
}

type authRefreshWithCookies struct {
	inner   openapi.AuthRefreshTokenResponseObject
	cookies []*http.Cookie
}

func (r authRefreshWithCookies) VisitAuthRefreshTokenResponse(w http.ResponseWriter) error {
	setCookies(w, r.cookies)
	return r.inner.VisitAuthRefreshTokenResponse(w)
}

type authLogoutWithCookies struct {
	inner   openapi.AuthLogoutResponseObject
	cookies []*http.Cookie
}

func (r authLogoutWithCookies) VisitAuthLogoutResponse(w http.ResponseWriter) error {
	setCookies(w, r.cookies)
	return r.inner.VisitAuthLogoutResponse(w)
}

// --- 候補者 auth cookie の構築 ---

func authCookies(secure bool, resp *presenter.AuthTokenResponse) []*http.Cookie {
	cookies := make([]*http.Cookie, 0, 4)
	cookies = append(cookies,
		&http.Cookie{ //nolint:gosec // G124: Secure は scheme で動的に設定（ローカルは http）
			Name:     "inselfy_token",
			Value:    resp.AccessToken,
			Path:     "/",
			HttpOnly: true,
			Secure:   secure,
			SameSite: http.SameSiteLaxMode,
			MaxAge:   86400,
		},
		&http.Cookie{ //nolint:gosec // G124: Secure は scheme で動的に設定（ローカルは http）
			Name:     "refresh_token",
			Value:    resp.RefreshToken,
			Path:     "/api/auth",
			HttpOnly: true,
			Secure:   secure,
			SameSite: http.SameSiteLaxMode,
			MaxAge:   604800,
		},
	)
	return append(cookies, userInfoCookies(resp.User, secure)...)
}

func userInfoCookies(user *openapi.ModelsAuthUserResponse, secure bool) []*http.Cookie {
	maxAge := 604800
	cookie := func(name, value string) *http.Cookie {
		return &http.Cookie{ //nolint:gosec // G124: Secure は scheme で動的に設定（ローカルは http）
			Name:     name,
			Value:    url.QueryEscape(value),
			Path:     "/",
			HttpOnly: true,
			Secure:   secure,
			SameSite: http.SameSiteLaxMode,
			MaxAge:   maxAge,
		}
	}
	return []*http.Cookie{cookie("userId", user.Id), cookie("username", user.Username)}
}

func clearedAuthCookies(secure bool) []*http.Cookie {
	expired := time.Unix(0, 0)
	// displayName は発行を廃止済み。既存ブラウザに残る cookie の掃除のため clear 対象には残す。
	cookies := make([]*http.Cookie, 0, 5)
	for _, name := range []string{"inselfy_token", "userId", "username", "displayName"} {
		cookies = append(cookies, &http.Cookie{ //nolint:gosec // G124: Secure は scheme で動的・JS 参照用 cookie は HttpOnly なし
			Name:     name,
			Value:    "",
			Path:     "/",
			HttpOnly: true,
			Secure:   secure,
			SameSite: http.SameSiteLaxMode,
			MaxAge:   -1,
			Expires:  expired,
		})
	}
	return append(cookies, &http.Cookie{ //nolint:gosec // G124: Secure は scheme で動的に設定（ローカルは http）
		Name:     "refresh_token",
		Value:    "",
		Path:     "/api/auth",
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
		Expires:  expired,
	})
}
