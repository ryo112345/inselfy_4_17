package middleware

import (
	"errors"
	"net/http"
	"strings"

	"github.com/getkin/kin-openapi/openapi3"
	"github.com/getkin/kin-openapi/openapi3filter"
	"github.com/getkin/kin-openapi/routers"
	"github.com/getkin/kin-openapi/routers/gorillamux"
	"github.com/labstack/echo/v4"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
)

// OpenAPIRequestValidator validates incoming requests against the embedded
// OpenAPI spec: body schema (maxLength, enum, required, ...), path and query
// parameters. Paths not present in the spec (uploads static files, admin
// routes, ...) pass through untouched, and auth stays with the JWT/admin-key
// middlewares — the spec's security requirements are not re-checked here.
func OpenAPIRequestValidator(specYAML []byte) (echo.MiddlewareFunc, error) {
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

	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			req := c.Request()

			route, pathParams, err := router.FindRoute(req)
			if err != nil {
				if errors.Is(err, routers.ErrPathNotFound) || errors.Is(err, routers.ErrMethodNotAllowed) {
					return next(c)
				}
				return next(c)
			}

			opts := &openapi3filter.Options{
				AuthenticationFunc: openapi3filter.NoopAuthenticationFunc,
			}
			// File uploads are size/extension-checked in the controllers;
			// buffering multipart bodies here would be wasted work.
			if strings.HasPrefix(req.Header.Get(echo.HeaderContentType), echo.MIMEMultipartForm) {
				opts.ExcludeRequestBody = true
			}

			input := &openapi3filter.RequestValidationInput{
				Request:    req,
				PathParams: pathParams,
				Route:      route,
				Options:    opts,
			}
			if err := openapi3filter.ValidateRequest(req.Context(), input); err != nil {
				return c.JSON(http.StatusBadRequest, openapi.ModelsBadRequestError{
					Code:    openapi.ModelsBadRequestErrorCodeBADREQUEST,
					Message: compactValidationError(err),
				})
			}

			return next(c)
		}
	}, nil
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
