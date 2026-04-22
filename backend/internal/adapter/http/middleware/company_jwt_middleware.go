package middleware

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"github.com/akiyama/inselfy/backend/internal/port"
)

const CompanyIDKey = "companyID"

func CompanyJWTAuth(jwtService port.JWTService) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			token := companyTokenFromCookie(c)
			if token == "" {
				token = tokenFromHeader(c)
			}
			if token == "" {
				return c.JSON(http.StatusUnauthorized, unauthorizedResponse)
			}

			companyID, err := jwtService.ValidateCompanyAccessToken(token)
			if err != nil {
				return c.JSON(http.StatusUnauthorized, unauthorizedResponse)
			}

			c.Set(CompanyIDKey, companyID)
			return next(c)
		}
	}
}

func companyTokenFromCookie(c echo.Context) string {
	cookie, err := c.Cookie("company_token")
	if err != nil || cookie.Value == "" {
		return ""
	}
	return cookie.Value
}
