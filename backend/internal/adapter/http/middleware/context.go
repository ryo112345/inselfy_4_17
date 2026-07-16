package middleware

import (
	"context"

	"github.com/labstack/echo/v4"
)

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

// authClaimsKey is the context key under which the spec-driven authenticator
// publishes validated claims.
type authClaimsKey struct{}

// authClaims is a mutable holder placed into the request context BEFORE
// OpenAPI validation runs, so the AuthenticationFunc (which only receives the
// context) can publish the IDs it validated. Requests are handled by a single
// goroutine and kin-openapi evaluates security requirements sequentially, so
// no synchronization is needed.
type authClaims struct {
	userID    string
	companyID string
}

// withAuthClaims returns a child context carrying an empty claims holder,
// plus the holder itself for reading after validation.
func withAuthClaims(ctx context.Context) (context.Context, *authClaims) {
	claims := &authClaims{}
	return context.WithValue(ctx, authClaimsKey{}, claims), claims
}

// UserIDFromContext returns the candidate user ID validated by the
// spec-driven authenticator, or "" for unauthenticated requests (public or
// optional-auth routes). context.Context counterpart of UserID.
func UserIDFromContext(ctx context.Context) string {
	if claims, ok := ctx.Value(authClaimsKey{}).(*authClaims); ok {
		return claims.userID
	}
	return ""
}

// CompanyIDFromContext returns the company ID validated by the spec-driven
// authenticator, or "" for unauthenticated requests. context.Context
// counterpart of CompanyID.
func CompanyIDFromContext(ctx context.Context) string {
	if claims, ok := ctx.Value(authClaimsKey{}).(*authClaims); ok {
		return claims.companyID
	}
	return ""
}
