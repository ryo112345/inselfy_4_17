package controller

import (
	"net/http"
	"net/url"
	"time"

	"github.com/labstack/echo/v4"

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

func (c *AuthController) GoogleLogin(ctx echo.Context) error {
	var body openapi.ModelsGoogleLoginRequest
	if err := ctx.Bind(&body); err != nil || body.IdToken == "" || len(body.IdToken) > 10000 {
		return badRequest(ctx, "invalid request")
	}

	pair, u, err := c.input.GoogleLogin(ctx.Request().Context(), body.IdToken)
	if err != nil {
		return handleAuthError(ctx, err)
	}
	tokenResp := presenter.AuthTokenPairResponse(pair, u).(*presenter.AuthTokenResponse)
	setAuthCookies(ctx, tokenResp)
	return ctx.JSON(http.StatusOK, tokenResp.User)
}

func (c *AuthController) Refresh(ctx echo.Context) error {
	cookie, err := ctx.Cookie("refresh_token")
	if err != nil || cookie.Value == "" {
		return handleAuthError(ctx, nil)
	}

	pair, u, err := c.input.RefreshToken(ctx.Request().Context(), cookie.Value)
	if err != nil {
		clearAuthCookies(ctx)
		return handleAuthError(ctx, err)
	}
	tokenResp := presenter.AuthTokenPairResponse(pair, u).(*presenter.AuthTokenResponse)
	setAuthCookies(ctx, tokenResp)
	return ctx.JSON(http.StatusOK, tokenResp.User)
}

func (c *AuthController) GetMe(ctx echo.Context) error {
	userID := authmw.UserID(ctx)

	u, err := c.input.GetCurrentUser(ctx.Request().Context(), userID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.AuthMeResponse(u))
}

func (c *AuthController) Logout(ctx echo.Context) error {
	clearAuthCookies(ctx)
	return ctx.NoContent(http.StatusNoContent)
}

func setAuthCookies(ctx echo.Context, resp *presenter.AuthTokenResponse) {
	secure := ctx.Scheme() == "https"
	ctx.SetCookie(&http.Cookie{
		Name:     "inselfy_token",
		Value:    resp.AccessToken,
		Path:     "/",
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   86400,
	})
	ctx.SetCookie(&http.Cookie{
		Name:     "refresh_token",
		Value:    resp.RefreshToken,
		Path:     "/api/auth",
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   604800,
	})
	setUserInfoCookies(ctx, resp.User, secure)
}

func setUserInfoCookies(ctx echo.Context, user *openapi.ModelsAuthUserResponse, secure bool) {
	maxAge := 604800
	setCookie := func(name, value string) {
		ctx.SetCookie(&http.Cookie{
			Name:     name,
			Value:    url.QueryEscape(value),
			Path:     "/",
			HttpOnly: true,
			Secure:   secure,
			SameSite: http.SameSiteLaxMode,
			MaxAge:   maxAge,
		})
	}
	setCookie("userId", user.Id)
	setCookie("username", user.Username)
}

func clearAuthCookies(ctx echo.Context) {
	secure := ctx.Scheme() == "https"
	expired := time.Unix(0, 0)
	// displayName は発行を廃止済み。既存ブラウザに残る cookie の掃除のため clear 対象には残す。
	for _, name := range []string{"inselfy_token", "userId", "username", "displayName"} {
		ctx.SetCookie(&http.Cookie{
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
	ctx.SetCookie(&http.Cookie{
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
