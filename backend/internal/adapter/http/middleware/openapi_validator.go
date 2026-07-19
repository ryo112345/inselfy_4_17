package middleware

import (
	"context"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/getkin/kin-openapi/openapi3filter"
	"github.com/getkin/kin-openapi/routers/gorillamux"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/driver/logging"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// OpenAPIRequestValidator validates incoming requests against the embedded
// OpenAPI spec: body schema (maxLength, enum, required, ...), path and query
// parameters, and the spec's security requirements (spec-driven auth). Routes
// declaring `security` get JWT / X-Admin-Key validation automatically;
// validated IDs are published to the request context (UserIDFromContext /
// CompanyIDFromContext / AdminIDFromContext). Paths not present in the spec
// (uploads static files, websocket, stripe webhook, health) pass through
// untouched.
// pool and adminStaticKey back the AdminAuth scheme (personal tokens stored
// hashed in the admins table, plus the ADMIN_API_KEY bootstrap key).
// validateResponses additionally buffers each spec route's response and logs
// contract violations (undeclared status, Content-Type, body schema) at
// ERROR without altering the response — dev/test only (OPENAPI_VALIDATE_RESPONSES),
// off in production for latency/memory (docs/strict-server-migration.md Phase 5).
func OpenAPIRequestValidator(specYAML []byte, jwtService port.JWTService, pool *pgxpool.Pool, adminStaticKey string, validateResponses bool) (func(http.Handler) http.Handler, error) {
	loader := openapi3.NewLoader()
	doc, err := loader.LoadFromData(specYAML)
	if err != nil {
		return nil, err
	}
	if err := doc.Validate(loader.Context); err != nil {
		return nil, err
	}
	// Ignore the servers list so routes match regardless of host/port.
	doc.Servers = nil

	router, err := gorillamux.NewRouter(doc)
	if err != nil {
		return nil, err
	}

	authFunc := newAuthenticationFunc(jwtService, generated.New(pool), adminStaticKey)

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			route, pathParams, err := router.FindRoute(r)
			if err != nil {
				// スペック外パス（uploads/ws/webhook/health）は素通し
				next.ServeHTTP(w, r)
				return
			}

			// Carry a claims holder in the request context so the
			// AuthenticationFunc can publish validated IDs, and so
			// handlers can read them via *FromContext helpers.
			ctx, claims := withAuthClaims(r.Context())
			r = r.WithContext(ctx)

			opts := &openapi3filter.Options{
				AuthenticationFunc: authFunc,
			}
			// File uploads are size/extension-checked in the controllers;
			// buffering multipart bodies here would be wasted work.
			if strings.HasPrefix(r.Header.Get("Content-Type"), "multipart/form-data") {
				opts.ExcludeRequestBody = true
			}

			input := &openapi3filter.RequestValidationInput{
				Request:    r,
				PathParams: pathParams,
				Route:      route,
				Options:    opts,
			}
			if err := openapi3filter.ValidateRequest(ctx, input); err != nil {
				var secErr *openapi3filter.SecurityRequirementsError
				if errors.As(err, &secErr) {
					writeJSONError(w, http.StatusUnauthorized, openapi.ModelsUnauthorizedError{
						Code:    openapi.ModelsUnauthorizedErrorCodeUNAUTHORIZED,
						Message: "unauthorized",
					})
					return
				}
				writeJSONError(w, http.StatusBadRequest, openapi.ModelsBadRequestError{
					Code:    openapi.ModelsBadRequestErrorCodeBADREQUEST,
					Message: compactValidationError(err),
				})
				return
			}

			if claims.adminAuthMethod != "" {
				annotateAuditLogger(ctx, claims.adminAuthMethod, claims.adminID)
			}

			if !validateResponses {
				next.ServeHTTP(w, r)
				return
			}
			capture := &responseCapture{ResponseWriter: w}
			next.ServeHTTP(capture, r)
			validateCapturedResponse(ctx, input, capture, r)
			capture.flush()
		})
	}, nil
}

// newAuthenticationFunc validates the security schemes declared in the spec
// (CandidateAuth / CompanyAuth / AdminAuth) and publishes the validated IDs
// into the claims holder carried by ctx. kin-openapi evaluates the OR
// alternatives of a `security` list sequentially in declaration order and
// stops at the first scheme that passes; an empty requirement `{}` always
// passes, which is how optional auth is expressed.
func newAuthenticationFunc(jwtService port.JWTService, queries *generated.Queries, adminStaticKey string) openapi3filter.AuthenticationFunc {
	return func(ctx context.Context, input *openapi3filter.AuthenticationInput) error {
		req := input.RequestValidationInput.Request

		token := schemeToken(req, input.SecurityScheme)
		if token == "" {
			return fmt.Errorf("security scheme %q: missing credentials", input.SecuritySchemeName)
		}

		claims, _ := ctx.Value(authClaimsKey{}).(*authClaims)

		switch input.SecuritySchemeName {
		case "CandidateAuth":
			userID, err := jwtService.ValidateAccessToken(token)
			if err != nil {
				return fmt.Errorf("security scheme %q: invalid token", input.SecuritySchemeName)
			}
			if claims != nil {
				claims.userID = userID
			}
		case "CompanyAuth":
			companyID, err := jwtService.ValidateCompanyAccessToken(token)
			if err != nil {
				return fmt.Errorf("security scheme %q: invalid token", input.SecuritySchemeName)
			}
			if claims != nil {
				claims.companyID = companyID
			}
		case "AdminAuth":
			// Static bootstrap key (ADMIN_API_KEY): valid but carries no
			// identity. Fail-closed: with no key configured and no admins
			// registered, every request is rejected.
			if adminStaticKey != "" && subtle.ConstantTimeCompare([]byte(token), []byte(adminStaticKey)) == 1 {
				if claims != nil {
					claims.adminAuthMethod = "static_key"
				}
				return nil
			}
			// Personal token issued at /admin/admins, stored as SHA-256.
			sum := sha256.Sum256([]byte(token))
			hash := pgtype.Text{String: hex.EncodeToString(sum[:]), Valid: true}
			admin, err := queries.GetAdminByAPIKeyHash(ctx, hash)
			if err != nil {
				return fmt.Errorf("security scheme %q: invalid key", input.SecuritySchemeName)
			}
			_ = queries.TouchAdminLastUsed(ctx, admin.ID)
			if claims != nil {
				claims.adminID = admin.ID.String()
				claims.adminAuthMethod = "personal_token"
			}
		default:
			return fmt.Errorf("security scheme %q is not supported", input.SecuritySchemeName)
		}
		return nil
	}
}

// schemeToken extracts the credential for an apiKey scheme. Header schemes
// (X-Admin-Key) read exactly the named header. Cookie schemes read the cookie
// named by the spec, with `Authorization: Bearer` as the documented
// development fallback (mirrors the legacy per-route middlewares).
func schemeToken(req *http.Request, scheme *openapi3.SecurityScheme) string {
	if scheme != nil && scheme.Type == "apiKey" {
		switch scheme.In {
		case "header":
			return req.Header.Get(scheme.Name)
		case "cookie":
			if cookie, err := req.Cookie(scheme.Name); err == nil && cookie.Value != "" {
				return cookie.Value
			}
		}
	}
	header := req.Header.Get("Authorization")
	token := strings.TrimPrefix(header, "Bearer ")
	if token == header {
		return ""
	}
	return token
}

// annotateAuditLogger enriches the request-scoped logger with the admin's
// identity, so the access log (and any handler logs) of admin operations
// records who performed them. The logger holder is mutated in place, so the
// upstream RequestLogging middleware sees the enrichment too.
func annotateAuditLogger(ctx context.Context, authMethod, adminID string) {
	logger := logging.FromContext(ctx).With("admin_auth", authMethod)
	if adminID != "" {
		logger = logger.With("admin_id", adminID)
	}
	logging.SetLogger(ctx, logger)
}

// compactValidationError flattens kin-openapi's multiline error (which embeds
// a schema dump) into a single readable line.
func compactValidationError(err error) string {
	var re *openapi3filter.RequestError
	msg := err.Error()
	if errors.As(err, &re) {
		msg = re.Error()
	}
	lines := strings.Split(msg, "\n")
	kept := make([]string, 0, len(lines))
	for _, l := range lines {
		l = strings.TrimSpace(l)
		if l == "" || strings.HasPrefix(l, "Schema:") || strings.HasPrefix(l, "{") ||
			strings.HasPrefix(l, "}") || strings.HasPrefix(l, "\"") {
			continue
		}
		kept = append(kept, l)
	}
	out := strings.Join(kept, " ")
	if len(out) > 500 {
		out = out[:500]
	}
	return out
}
