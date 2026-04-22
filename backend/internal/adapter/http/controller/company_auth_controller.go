package controller

import (
	"errors"
	"net/http"
	"net/url"
	"time"

	"github.com/labstack/echo/v4"

	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/domain/company"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type CompanyAuthController struct {
	inputFactory        func(companyRepo port.CompanyAccountRepository, refreshRepo port.CompanyRefreshTokenRepository, output port.CompanyAuthOutputPort) port.CompanyAuthInputPort
	outputFactory       func() *presenter.CompanyAuthPresenter
	companyRepoFactory  func() port.CompanyAccountRepository
	refreshRepoFactory  func() port.CompanyRefreshTokenRepository
}

func NewCompanyAuthController(
	inputFactory func(companyRepo port.CompanyAccountRepository, refreshRepo port.CompanyRefreshTokenRepository, output port.CompanyAuthOutputPort) port.CompanyAuthInputPort,
	outputFactory func() *presenter.CompanyAuthPresenter,
	companyRepoFactory func() port.CompanyAccountRepository,
	refreshRepoFactory func() port.CompanyRefreshTokenRepository,
) *CompanyAuthController {
	return &CompanyAuthController{
		inputFactory:        inputFactory,
		outputFactory:       outputFactory,
		companyRepoFactory:  companyRepoFactory,
		refreshRepoFactory:  refreshRepoFactory,
	}
}

func (c *CompanyAuthController) Register(ctx echo.Context) error {
	var body struct {
		Email             string `json:"email"`
		Password          string `json:"password"`
		CompanyName       string `json:"companyName"`
		ContactPersonName string `json:"contactPersonName"`
		PhoneNumber       string `json:"phoneNumber"`
	}
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request")
	}

	input, p := c.newIO()
	err := input.Register(ctx.Request().Context(), company.RegisterInput{
		Email:             body.Email,
		Password:          body.Password,
		CompanyName:       body.CompanyName,
		ContactPersonName: body.ContactPersonName,
		PhoneNumber:       body.PhoneNumber,
	})
	if err != nil {
		return handleCompanyAuthError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, p.RegisteredResponse())
}

func (c *CompanyAuthController) Login(ctx echo.Context) error {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := ctx.Bind(&body); err != nil || body.Email == "" || body.Password == "" {
		return badRequest(ctx, "invalid request")
	}

	input, p := c.newIO()
	if err := input.Login(ctx.Request().Context(), body.Email, body.Password); err != nil {
		return handleCompanyAuthError(ctx, err)
	}
	setCompanyAuthCookies(ctx, p.TokenResponse())
	return ctx.JSON(http.StatusOK, p.TokenResponse().Company)
}

func (c *CompanyAuthController) Refresh(ctx echo.Context) error {
	cookie, err := ctx.Cookie("company_refresh_token")
	if err != nil || cookie.Value == "" {
		return handleCompanyAuthError(ctx, nil)
	}

	input, p := c.newIO()
	if err := input.RefreshToken(ctx.Request().Context(), cookie.Value); err != nil {
		clearCompanyAuthCookies(ctx)
		return handleCompanyAuthError(ctx, err)
	}
	setCompanyAuthCookies(ctx, p.TokenResponse())
	return ctx.JSON(http.StatusOK, p.TokenResponse().Company)
}

func (c *CompanyAuthController) GetMe(ctx echo.Context) error {
	companyID, ok := ctx.Get(authmw.CompanyIDKey).(string)
	if !ok || companyID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	input, p := c.newIO()
	if err := input.GetCurrentCompany(ctx.Request().Context(), companyID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.CompanyResponse())
}

func (c *CompanyAuthController) Logout(ctx echo.Context) error {
	clearCompanyAuthCookies(ctx)
	return ctx.NoContent(http.StatusNoContent)
}

func (c *CompanyAuthController) newIO() (port.CompanyAuthInputPort, *presenter.CompanyAuthPresenter) {
	output := c.outputFactory()
	input := c.inputFactory(c.companyRepoFactory(), c.refreshRepoFactory(), output)
	return input, output
}

func setCompanyAuthCookies(ctx echo.Context, resp *presenter.CompanyAuthTokenResponse) {
	secure := ctx.Scheme() == "https"
	ctx.SetCookie(&http.Cookie{
		Name:     "company_token",
		Value:    resp.AccessToken,
		Path:     "/",
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   900,
	})
	ctx.SetCookie(&http.Cookie{
		Name:     "company_refresh_token",
		Value:    resp.RefreshToken,
		Path:     "/api/company/auth",
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   604800,
	})
	setCookie := func(name, value string) {
		ctx.SetCookie(&http.Cookie{
			Name:     name,
			Value:    url.QueryEscape(value),
			Path:     "/",
			Secure:   secure,
			SameSite: http.SameSiteLaxMode,
			MaxAge:   604800,
		})
	}
	setCookie("companyId", resp.Company.ID)
	setCookie("companyName", resp.Company.CompanyName)
}

func clearCompanyAuthCookies(ctx echo.Context) {
	secure := ctx.Scheme() == "https"
	expired := time.Unix(0, 0)
	for _, name := range []string{"company_token", "companyId", "companyName"} {
		ctx.SetCookie(&http.Cookie{
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
	ctx.SetCookie(&http.Cookie{
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
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}
	switch {
	case errors.Is(err, company.ErrInvalidCredentials):
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "invalid email or password",
		})
	case errors.Is(err, company.ErrAccountPending):
		return ctx.JSON(http.StatusForbidden, map[string]string{
			"code":    "ACCOUNT_PENDING",
			"message": "your account is awaiting admin approval",
		})
	case errors.Is(err, company.ErrAccountRejected):
		return ctx.JSON(http.StatusForbidden, map[string]string{
			"code":    "ACCOUNT_REJECTED",
			"message": "your account registration has been rejected",
		})
	case errors.Is(err, company.ErrEmailAlreadyRegistered):
		return ctx.JSON(http.StatusConflict, map[string]string{
			"code":    "CONFLICT",
			"message": err.Error(),
		})
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
