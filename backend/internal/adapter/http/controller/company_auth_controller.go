package controller

import (
	"context"
	"errors"
	"net/http"
	"net/url"
	"time"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
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

// Register handles POST /api/company/auth/register.
func (c *CompanyAuthController) Register(ctx context.Context, req openapi.CompanyAuthCompanyRegisterRequestObject) (openapi.CompanyAuthCompanyRegisterResponseObject, error) {
	if req.Body == nil {
		return openapi.CompanyAuthCompanyRegister400JSONResponse(badRequestBody("invalid request")), nil
	}

	account, err := c.input.Register(ctx, company.RegisterInput{
		Email:             req.Body.Email,
		Password:          req.Body.Password,
		CompanyName:       req.Body.CompanyName,
		ContactPersonName: req.Body.ContactPersonName,
		PhoneNumber:       req.Body.PhoneNumber,
	})
	if err != nil {
		switch {
		case errors.Is(err, company.ErrEmailAlreadyRegistered):
			return openapi.CompanyAuthCompanyRegister409JSONResponse(conflictBody(err)), nil
		case isCompanyBadRequest(err):
			return openapi.CompanyAuthCompanyRegister400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	resp := presenter.CompanyRegisteredResponse(account).(*openapi.ModelsCompanyResponse)
	return openapi.CompanyAuthCompanyRegister201JSONResponse(*resp), nil
}

// Login handles POST /api/company/auth/login.
func (c *CompanyAuthController) Login(ctx context.Context, req openapi.CompanyAuthCompanyLoginRequestObject) (openapi.CompanyAuthCompanyLoginResponseObject, error) {
	if req.Body == nil || req.Body.Email == "" || req.Body.Password == "" {
		return openapi.CompanyAuthCompanyLogin400JSONResponse(badRequestBody("invalid request")), nil
	}

	pair, account, err := c.input.Login(ctx, req.Body.Email, req.Body.Password)
	if err != nil {
		switch {
		case errors.Is(err, company.ErrInvalidCredentials):
			return openapi.CompanyAuthCompanyLogin401JSONResponse(unauthorizedBody("invalid email or password")), nil
		case errors.Is(err, company.ErrAccountPending):
			return openapi.CompanyAuthCompanyLogin403JSONResponse(openapi.ModelsCompanyAccountStatusError{
				Code:    openapi.ModelsCompanyAccountStatusErrorCodeACCOUNTPENDING,
				Message: "your account is awaiting admin approval",
			}), nil
		case errors.Is(err, company.ErrAccountRejected):
			return openapi.CompanyAuthCompanyLogin403JSONResponse(openapi.ModelsCompanyAccountStatusError{
				Code:    openapi.ModelsCompanyAccountStatusErrorCodeACCOUNTREJECTED,
				Message: "your account registration has been rejected",
			}), nil
		}
		return nil, err
	}
	tokenResp := presenter.CompanyTokenResponse(pair, account).(*presenter.CompanyAuthTokenResponse)
	return companyLoginWithCookies{
		inner:   openapi.CompanyAuthCompanyLogin200JSONResponse(*tokenResp.Company),
		cookies: companyAuthCookies(isSecureRequest(ctx), tokenResp),
	}, nil
}

// Refresh handles POST /api/company/auth/refresh. company_refresh_token cookie
// は RequestObject に現れないため、context 経由の *http.Request から読む。
func (c *CompanyAuthController) Refresh(ctx context.Context, _ openapi.CompanyAuthCompanyRefreshTokenRequestObject) (openapi.CompanyAuthCompanyRefreshTokenResponseObject, error) {
	secure := isSecureRequest(ctx)
	value, ok := cookieValue(ctx, "company_refresh_token")
	if !ok {
		return openapi.CompanyAuthCompanyRefreshToken401JSONResponse(unauthorizedBody("unauthorized")), nil
	}

	pair, account, err := c.input.RefreshToken(ctx, value)
	if err != nil {
		if isUnauthorizedAuthError(err) {
			return companyRefreshWithCookies{
				inner:   openapi.CompanyAuthCompanyRefreshToken401JSONResponse(unauthorizedBody("unauthorized")),
				cookies: clearedCompanyAuthCookies(secure),
			}, nil
		}
		return nil, err
	}
	tokenResp := presenter.CompanyTokenResponse(pair, account).(*presenter.CompanyAuthTokenResponse)
	return companyRefreshWithCookies{
		inner:   openapi.CompanyAuthCompanyRefreshToken200JSONResponse(*tokenResp.Company),
		cookies: companyAuthCookies(secure, tokenResp),
	}, nil
}

// GetMe handles GET /api/company/auth/me.
func (c *CompanyAuthController) GetMe(ctx context.Context, _ openapi.CompanyAuthCompanyGetMeRequestObject) (openapi.CompanyAuthCompanyGetMeResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)

	account, err := c.input.GetCurrentCompany(ctx, companyID)
	if err != nil {
		if errorStatus(err) == http.StatusNotFound {
			return openapi.CompanyAuthCompanyGetMe404JSONResponse(notFoundBody(err)), nil
		}
		return nil, err
	}
	resp := presenter.CompanyMeResponse(account).(*openapi.ModelsCompanyResponse)
	return openapi.CompanyAuthCompanyGetMe200JSONResponse(*resp), nil
}

// Logout handles POST /api/company/auth/logout.
func (c *CompanyAuthController) Logout(ctx context.Context, _ openapi.CompanyAuthCompanyLogoutRequestObject) (openapi.CompanyAuthCompanyLogoutResponseObject, error) {
	return companyLogoutWithCookies{
		inner:   openapi.CompanyAuthCompanyLogout204Response{},
		cookies: clearedCompanyAuthCookies(isSecureRequest(ctx)),
	}, nil
}

// --- cookie 焼き込み用 Visitor ラッパー（docs/strict-server-migration.md 3-3） ---

type companyLoginWithCookies struct {
	inner   openapi.CompanyAuthCompanyLoginResponseObject
	cookies []*http.Cookie
}

func (r companyLoginWithCookies) VisitCompanyAuthCompanyLoginResponse(w http.ResponseWriter) error {
	setCookies(w, r.cookies)
	return r.inner.VisitCompanyAuthCompanyLoginResponse(w)
}

type companyRefreshWithCookies struct {
	inner   openapi.CompanyAuthCompanyRefreshTokenResponseObject
	cookies []*http.Cookie
}

func (r companyRefreshWithCookies) VisitCompanyAuthCompanyRefreshTokenResponse(w http.ResponseWriter) error {
	setCookies(w, r.cookies)
	return r.inner.VisitCompanyAuthCompanyRefreshTokenResponse(w)
}

type companyLogoutWithCookies struct {
	inner   openapi.CompanyAuthCompanyLogoutResponseObject
	cookies []*http.Cookie
}

func (r companyLogoutWithCookies) VisitCompanyAuthCompanyLogoutResponse(w http.ResponseWriter) error {
	setCookies(w, r.cookies)
	return r.inner.VisitCompanyAuthCompanyLogoutResponse(w)
}

// --- 企業 auth cookie の構築 ---

func companyAuthCookies(secure bool, resp *presenter.CompanyAuthTokenResponse) []*http.Cookie {
	// ローカル開発は http のため Secure は scheme で切り替える（本番は常に https）
	cookies := make([]*http.Cookie, 0, 4)
	cookies = append(cookies,
		&http.Cookie{ //nolint:gosec // G124: Secure は上記の通り動的に設定
			Name:     "company_token",
			Value:    resp.AccessToken,
			Path:     "/",
			HttpOnly: true,
			Secure:   secure,
			SameSite: http.SameSiteLaxMode,
			MaxAge:   86400,
		},
		&http.Cookie{ //nolint:gosec // G124: Secure は scheme で動的に設定
			Name:     "company_refresh_token",
			Value:    resp.RefreshToken,
			Path:     "/api/company/auth",
			HttpOnly: true,
			Secure:   secure,
			SameSite: http.SameSiteLaxMode,
			MaxAge:   604800,
		},
	)
	// companyId/companyName はフロントの JS から参照するため HttpOnly を付けない
	cookie := func(name, value string) *http.Cookie {
		return &http.Cookie{ //nolint:gosec // G124: JS 参照用のため HttpOnly なし・Secure は動的
			Name:     name,
			Value:    url.QueryEscape(value),
			Path:     "/",
			Secure:   secure,
			SameSite: http.SameSiteLaxMode,
			MaxAge:   604800,
		}
	}
	return append(cookies,
		cookie("companyId", resp.Company.Id),
		cookie("companyName", resp.Company.CompanyName),
	)
}

func clearedCompanyAuthCookies(secure bool) []*http.Cookie {
	expired := time.Unix(0, 0)
	cookies := make([]*http.Cookie, 0, 4)
	for _, name := range []string{"company_token", "companyId", "companyName"} {
		cookies = append(cookies, &http.Cookie{ //nolint:gosec // G124: Secure は scheme で動的・JS 参照用 cookie は HttpOnly なし
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
	return append(cookies, &http.Cookie{ //nolint:gosec // G124: Secure は scheme で動的に設定（ローカルは http）
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
