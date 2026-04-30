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
	inputFactory   func(userRepo port.UserRepository, refreshRepo port.RefreshTokenRepository, output port.AuthOutputPort) port.AuthInputPort
	outputFactory  func() *presenter.AuthPresenter
	repoFactory    func() port.UserRepository
	refreshFactory func() port.RefreshTokenRepository
}

func NewAuthController(
	inputFactory func(userRepo port.UserRepository, refreshRepo port.RefreshTokenRepository, output port.AuthOutputPort) port.AuthInputPort,
	outputFactory func() *presenter.AuthPresenter,
	repoFactory func() port.UserRepository,
	refreshFactory func() port.RefreshTokenRepository,
) *AuthController {
	return &AuthController{
		inputFactory:   inputFactory,
		outputFactory:  outputFactory,
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

	input, p := c.newIO()
	if err := input.GoogleLogin(ctx.Request().Context(), body.IDToken); err != nil {
		return handleAuthError(ctx, err)
	}
	setAuthCookies(ctx, p.TokenResponse())
	return ctx.JSON(http.StatusOK, p.TokenResponse().User)
}

func (c *AuthController) Refresh(ctx echo.Context) error {
	cookie, err := ctx.Cookie("refresh_token")
	if err != nil || cookie.Value == "" {
		return handleAuthError(ctx, nil)
	}

	input, p := c.newIO()
	if err := input.RefreshToken(ctx.Request().Context(), cookie.Value); err != nil {
		clearAuthCookies(ctx)
		return handleAuthError(ctx, err)
	}
	setAuthCookies(ctx, p.TokenResponse())
	return ctx.JSON(http.StatusOK, p.TokenResponse().User)
}

func (c *AuthController) GetMe(ctx echo.Context) error {
	userID, ok := ctx.Get(authmw.UserIDKey).(string)
	if !ok || userID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	input, p := c.newIO()
	if err := input.GetCurrentUser(ctx.Request().Context(), userID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.UserResponse())
}

func (c *AuthController) Logout(ctx echo.Context) error {
	clearAuthCookies(ctx)
	return ctx.NoContent(http.StatusNoContent)
}

func (c *AuthController) newIO() (port.AuthInputPort, *presenter.AuthPresenter) {
	output := c.outputFactory()
	input := c.inputFactory(c.repoFactory(), c.refreshFactory(), output)
	return input, output
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
	if user.DisplayName != nil {
		setCookie("displayName", *user.DisplayName)
	}
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
