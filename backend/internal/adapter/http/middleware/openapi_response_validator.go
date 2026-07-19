package middleware

import (
	"bytes"
	"context"
	"io"
	"net/http"

	"github.com/getkin/kin-openapi/openapi3filter"

	"github.com/akiyama/inselfy/backend/internal/driver/logging"
)

// responseCapture buffers a handler's response so it can be validated against
// the spec before being sent. Headers pass through to the underlying writer
// (Header returns the real map via the embedded interface); status and body
// are held back until flush. Only spec routes are captured — they are all
// small JSON bodies, never streaming/hijacked connections (WS and uploads are
// spec-external and bypass the validator entirely).
type responseCapture struct {
	http.ResponseWriter
	status int
	body   bytes.Buffer
}

func (c *responseCapture) WriteHeader(code int) {
	if c.status == 0 {
		c.status = code
	}
}

func (c *responseCapture) Write(b []byte) (int, error) {
	if c.status == 0 {
		c.status = http.StatusOK
	}
	return c.body.Write(b)
}

// flush sends the captured response unchanged: validation only observes, a
// violating response still reaches the client exactly as the handler wrote it
// (dev must not behave differently from prod beyond the log line).
func (c *responseCapture) flush() {
	if c.status == 0 {
		c.status = http.StatusOK
	}
	c.ResponseWriter.WriteHeader(c.status)
	if c.body.Len() > 0 {
		_, _ = c.ResponseWriter.Write(c.body.Bytes())
	}
}

// validateCapturedResponse checks the captured response against the matched
// operation's response contract (status declared, Content-Type, body schema)
// and logs a violation at ERROR. IncludeResponseStatus makes undeclared
// status codes (e.g. an unspecced 500) violations too.
func validateCapturedResponse(ctx context.Context, reqInput *openapi3filter.RequestValidationInput, c *responseCapture, r *http.Request) {
	status := c.status
	if status == 0 {
		status = http.StatusOK
	}
	err := openapi3filter.ValidateResponse(ctx, &openapi3filter.ResponseValidationInput{
		RequestValidationInput: reqInput,
		Status:                 status,
		Header:                 c.Header(),
		Body:                   io.NopCloser(bytes.NewReader(c.body.Bytes())),
		Options:                &openapi3filter.Options{IncludeResponseStatus: true},
	})
	if err != nil {
		logging.FromContext(ctx).Error("response contract violation",
			"method", r.Method,
			"path", r.URL.Path,
			"status", status,
			"error", compactValidationError(err),
		)
	}
}
