package middleware

import "github.com/labstack/echo/v4"

// CompanyID returns the authenticated company ID from the request context.
// Routes that call this MUST be registered behind CompanyJWTAuth, which rejects
// unauthenticated requests with 401 and always sets a non-empty CompanyIDKey
// before the handler runs. The presence check is therefore unnecessary here.
func CompanyID(c echo.Context) string {
	id, _ := c.Get(CompanyIDKey).(string)
	return id
}

// UserID returns the authenticated user ID from the request context.
// Routes that call this MUST be registered behind JWTAuth (required auth).
// For routes behind OptionalJWTAuth, read the key directly and branch on
// presence instead — the value may be empty there.
func UserID(c echo.Context) string {
	id, _ := c.Get(UserIDKey).(string)
	return id
}
