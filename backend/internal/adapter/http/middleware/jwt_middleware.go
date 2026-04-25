package middleware

import (
	"net/http"
	"strings"

	"github.com/labstack/echo/v4"

	"github.com/akiyama/inselfy/backend/internal/port"
)

const UserIDKey = "userID"

var unauthorizedResponse = map[string]string{
	"code":    "UNAUTHORIZED",
	"message": "unauthorized",
}

func JWTAuth(jwtService port.JWTService) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			token := tokenFromCookie(c)
			if token == "" {
				token = tokenFromHeader(c)
			}
			if token == "" {
				return c.JSON(http.StatusUnauthorized, unauthorizedResponse)
			}

			userID, err := jwtService.ValidateAccessToken(token)
			if err != nil {
				return c.JSON(http.StatusUnauthorized, unauthorizedResponse)
			}

			c.Set(UserIDKey, userID)
			return next(c)
		}
	}
}

func OptionalJWTAuth(jwtService port.JWTService) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			token := tokenFromCookie(c)
			if token == "" {
				token = tokenFromHeader(c)
			}
			if token != "" {
				if userID, err := jwtService.ValidateAccessToken(token); err == nil {
					c.Set(UserIDKey, userID)
				}
			}
			return next(c)
		}
	}
}

func tokenFromCookie(c echo.Context) string {
	cookie, err := c.Cookie("inselfy_token")
	if err != nil || cookie.Value == "" {
		return ""
	}
	return cookie.Value
}

func tokenFromHeader(c echo.Context) string {
	header := c.Request().Header.Get("Authorization")
	if header == "" {
		return ""
	}
	token := strings.TrimPrefix(header, "Bearer ")
	if token == header {
		return ""
	}
	return token
}
