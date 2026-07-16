package middleware

import (
	"context"
)

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

	// adminAuthMethod is "static_key" or "personal_token" when AdminAuth
	// passed; adminID is set only for personal tokens.
	adminID         string
	adminAuthMethod string
}

// withAuthClaims returns a child context carrying an empty claims holder,
// plus the holder itself for reading after validation.
func withAuthClaims(ctx context.Context) (context.Context, *authClaims) {
	claims := &authClaims{}
	return context.WithValue(ctx, authClaimsKey{}, claims), claims
}

// UserIDFromContext returns the candidate user ID validated by the
// spec-driven authenticator, or "" for unauthenticated requests (public or
// optional-auth routes).
func UserIDFromContext(ctx context.Context) string {
	if claims, ok := ctx.Value(authClaimsKey{}).(*authClaims); ok {
		return claims.userID
	}
	return ""
}

// CompanyIDFromContext returns the company ID validated by the spec-driven
// authenticator, or "" for unauthenticated requests.
func CompanyIDFromContext(ctx context.Context) string {
	if claims, ok := ctx.Value(authClaimsKey{}).(*authClaims); ok {
		return claims.companyID
	}
	return ""
}

// AdminIDFromContext returns the admin ID validated by the spec-driven
// authenticator, or "" when the static bootstrap key was used (it carries no
// identity) or the request is unauthenticated.
func AdminIDFromContext(ctx context.Context) string {
	if claims, ok := ctx.Value(authClaimsKey{}).(*authClaims); ok {
		return claims.adminID
	}
	return ""
}
