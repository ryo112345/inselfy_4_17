package controller

import (
	"errors"
	"net/http"
	"net/url"
	"time"

	"github.com/labstack/echo/v4"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/domain/auth"
	"github.com/akiyama/inselfy/backend/internal/domain/company"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type CompanyAuthController struct {
	input port.CompanyAuthInputPort
}

func NewCompanyAuthController(
	input port.CompanyAuthInputPort,
) *CompanyAuthController {
	return &CompanyAuthController{input: input}
}

func (c *CompanyAuthController) Register(ctx echo.Context) error {
	var body openapi.ModelsCompanyRegisterRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request")
	}

	account, err := c.input.Register(ctx.Request().Context(), company.RegisterInput{
		Email:             body.Email,
		Password:          body.Password,
		CompanyName:       body.CompanyName,
		ContactPersonName: body.ContactPersonName,
		PhoneNumber:       body.PhoneNumber,
	})
	if err != nil {
		return handleCompanyAuthError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, presenter.CompanyRegisteredResponse(account))
}

func (c *CompanyAuthController) Login(ctx echo.Context) error {
	var body openapi.ModelsCompanyLoginRequest
	if err := ctx.Bind(&body); err != nil || body.Email == "" || body.Password == "" {
		return badRequest(ctx, "invalid request")
	}

	pair, account, err := c.input.Login(ctx.Request().Context(), body.Email, body.Password)
	if err != nil {
		return handleCompanyAuthError(ctx, err)
	}
	tokenResp := presenter.CompanyTokenResponse(pair, account).(*presenter.CompanyAuthTokenResponse)
	setCompanyAuthCookies(ctx, tokenResp)
	return ctx.JSON(http.StatusOK, tokenResp.Company)
}

func (c *CompanyAuthController) Refresh(ctx echo.Context) error {
	cookie, err := ctx.Cookie("company_refresh_token")
	if err != nil || cookie.Value == "" {
		return handleCompanyAuthError(ctx, nil)
	}

	pair, account, err := c.input.RefreshToken(ctx.Request().Context(), cookie.Value)
	if err != nil {
		clearCompanyAuthCookies(ctx)
		return handleCompanyAuthError(ctx, err)
	}
	tokenResp := presenter.CompanyTokenResponse(pair, account).(*presenter.CompanyAuthTokenResponse)
	setCompanyAuthCookies(ctx, tokenResp)
	return ctx.JSON(http.StatusOK, tokenResp.Company)
}

func (c *CompanyAuthController) GetMe(ctx echo.Context) error {
	companyID := authmw.CompanyID(ctx)

	account, err := c.input.GetCurrentCompany(ctx.Request().Context(), companyID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.CompanyMeResponse(account))
}

func (c *CompanyAuthController) Logout(ctx echo.Context) error {
	clearCompanyAuthCookies(ctx)
	return ctx.NoContent(http.StatusNoContent)
}

func setCompanyAuthCookies(ctx echo.Context, resp *presenter.CompanyAuthTokenResponse) {
	secure := ctx.Scheme() == "https"
	// ローカル開発は http のため Secure は scheme で切り替える（本番は常に https）
	ctx.SetCookie(&http.Cookie{ //nolint:gosec // G124: Secure は上記の通り動的に設定
		Name:     "company_token",
		Value:    resp.AccessToken,
		Path:     "/",
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   86400,
	})
	ctx.SetCookie(&http.Cookie{ //nolint:gosec // G124: Secure は scheme で動的に設定
		Name:     "company_refresh_token",
		Value:    resp.RefreshToken,
		Path:     "/api/company/auth",
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   604800,
	})
	setCookie := func(name, value string) {
		// companyId/companyName はフロントの JS から参照するため HttpOnly を付けない
		ctx.SetCookie(&http.Cookie{ //nolint:gosec // G124: JS 参照用のため HttpOnly なし・Secure は動的
			Name:     name,
			Value:    url.QueryEscape(value),
			Path:     "/",
			Secure:   secure,
			SameSite: http.SameSiteLaxMode,
			MaxAge:   604800,
		})
	}
	setCookie("companyId", resp.Company.Id)
	setCookie("companyName", resp.Company.CompanyName)
}

func clearCompanyAuthCookies(ctx echo.Context) {
	secure := ctx.Scheme() == "https"
	expired := time.Unix(0, 0)
	for _, name := range []string{"company_token", "companyId", "companyName"} {
		ctx.SetCookie(&http.Cookie{ //nolint:gosec // G124: Secure は scheme で動的・JS 参照用 cookie は HttpOnly なし
			Name:     name,
			Value:    "",
			Path:     "/",
			HttpOnly: name == "company_token",
			Secure:   secure,
			SameSite: http.SameSiteLaxMode,
			MaxAge:   -1,
			Expires:  expired,
		})
	}
	ctx.SetCookie(&http.Cookie{ //nolint:gosec // G124: Secure は scheme で動的に設定（ローカルは http）
		Name:     "company_refresh_token",
		Value:    "",
		Path:     "/api/company/auth",
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
		Expires:  expired,
	})
}

func handleCompanyAuthError(ctx echo.Context, err error) error {
	if err == nil {
		return unauthorized(ctx, "unauthorized")
	}
	switch {
	case errors.Is(err, company.ErrInvalidCredentials):
		return unauthorized(ctx, "invalid email or password")
	case errors.Is(err, auth.ErrRefreshTokenRevoked),
		errors.Is(err, auth.ErrTokenExpired),
		errors.Is(err, auth.ErrUnauthorized):
		// 失効 refresh cookie は正常系のエラー。候補者側（handleAuthError）と
		// 同じく 401 にする（以前は分類漏れで 500 INTERNAL になっていた）。
		return unauthorized(ctx, "unauthorized")
	case errors.Is(err, company.ErrAccountPending):
		return errorResponse(ctx, http.StatusForbidden, "ACCOUNT_PENDING", "your account is awaiting admin approval")
	case errors.Is(err, company.ErrAccountRejected):
		return errorResponse(ctx, http.StatusForbidden, "ACCOUNT_REJECTED", "your account registration has been rejected")
	case errors.Is(err, company.ErrEmailAlreadyRegistered):
		return errorResponse(ctx, http.StatusConflict, "CONFLICT", err.Error())
	case isCompanyBadRequest(err):
		return badRequest(ctx, err.Error())
	}
	return handleError(ctx, err)
}

func isCompanyBadRequest(err error) bool {
	switch {
	case errors.Is(err, company.ErrEmailRequired),
		errors.Is(err, company.ErrInvalidEmail),
		errors.Is(err, company.ErrPasswordTooShort),
		errors.Is(err, company.ErrCompanyNameRequired),
		errors.Is(err, company.ErrContactPersonNameRequired),
		errors.Is(err, company.ErrPhoneNumberRequired),
		errors.Is(err, company.ErrCompanyNameTooLong),
		errors.Is(err, company.ErrContactPersonNameTooLong),
		errors.Is(err, company.ErrPhoneNumberTooLong),
		errors.Is(err, company.ErrEmailTooLong):
		return true
	}
	return false
}
