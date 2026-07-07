package middleware

import (
	"net/http"

	"github.com/labstack/echo/v4"

	"github.com/akiyama/inselfy/backend/internal/port"
)

// AnyJWTAuth accepts either a candidate or a company access token.
// On success it sets UserIDKey or CompanyIDKey respectively; requests
// without a valid token of either kind are rejected with 401.
func AnyJWTAuth(jwtService port.JWTService) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			if token := tokenFromCookie(c); token != "" {
				if userID, err := jwtService.ValidateAccessToken(token); err == nil {
					c.Set(UserIDKey, userID)
					return next(c)
				}
			}
			if token := companyTokenFromCookie(c); token != "" {
				if companyID, err := jwtService.ValidateCompanyAccessToken(token); err == nil {
					c.Set(CompanyIDKey, companyID)
					return next(c)
				}
			}
			if token := tokenFromHeader(c); token != "" {
				if userID, err := jwtService.ValidateAccessToken(token); err == nil {
					c.Set(UserIDKey, userID)
					return next(c)
				}
				if companyID, err := jwtService.ValidateCompanyAccessToken(token); err == nil {
					c.Set(CompanyIDKey, companyID)
					return next(c)
				}
			}
			return c.JSON(http.StatusUnauthorized, unauthorizedResponse)
		}
	}
}
