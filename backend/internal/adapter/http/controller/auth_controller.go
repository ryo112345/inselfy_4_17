package controller

import (
	"net/http"
	"net/url"
	"time"

	"github.com/labstack/echo/v4"

	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type AuthController struct {
	inputFactory   func(userRepo port.UserRepository, refreshRepo port.RefreshTokenRepository) port.AuthInputPort
	repoFactory    func() port.UserRepository
	refreshFactory func() port.RefreshTokenRepository
}

func NewAuthController(
	inputFactory func(userRepo port.UserRepository, refreshRepo port.RefreshTokenRepository) port.AuthInputPort,
	repoFactory func() port.UserRepository,
	refreshFactory func() port.RefreshTokenRepository,
) *AuthController {
	return &AuthController{
		inputFactory:   inputFactory,
		repoFactory:    repoFactory,
		refreshFactory: refreshFactory,
	}
}

func (c *AuthController) GoogleLogin(ctx echo.Context) error {
	var body struct {
		IDToken string `json:"idToken"`
	}
	if err := ctx.Bind(&body); err != nil || body.IDToken == "" || len(body.IDToken) > 10000 {
		return badRequest(ctx, "invalid request")
	}

	pair, u, err := c.newInput().GoogleLogin(ctx.Request().Context(), body.IDToken)
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

	pair, u, err := c.newInput().RefreshToken(ctx.Request().Context(), cookie.Value)
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

	u, err := c.newInput().GetCurrentUser(ctx.Request().Context(), userID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.AuthMeResponse(u))
}

func (c *AuthController) Logout(ctx echo.Context) error {
	clearAuthCookies(ctx)
	return ctx.NoContent(http.StatusNoContent)
}

func (c *AuthController) newInput() port.AuthInputPort {
	return c.inputFactory(c.repoFactory(), c.refreshFactory())
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
		MaxAge:   900,
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

func setUserInfoCookies(ctx echo.Context, user *presenter.AuthUserResponse, secure bool) {
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
	setCookie("userId", user.ID)
	setCookie("username", user.Username)
	setCookie("displayName", user.Name)
}

func clearAuthCookies(ctx echo.Context) {
	secure := ctx.Scheme() == "https"
	expired := time.Unix(0, 0)
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
