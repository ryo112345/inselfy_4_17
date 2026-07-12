package middleware

import (
	"log/slog"
	"time"

	"github.com/labstack/echo/v4"

	"github.com/akiyama/inselfy/backend/internal/driver/logging"
)

// Cloud Run の probe が数秒おきに叩くため、成功時はアクセスログを出さない
var healthPaths = map[string]bool{
	"/healthz":     true,
	"/readyz":      true,
	"/api/healthz": true,
	"/api/readyz":  true,
}

// RequestLogging replaces echo's default Logger middleware: it emits one
// structured slog entry per request and stores a request-scoped logger in the
// request context (retrieve with logging.FromContext). On Cloud Run the
// logger carries the Cloud Trace ID, so app logs and access logs of the same
// request line up in Cloud Logging.
func RequestLogging(projectID string) echo.MiddlewareFunc {
	return func(next echo.HandlerFunc) echo.HandlerFunc {
		return func(c echo.Context) error {
			req := c.Request()
			logger := slog.Default()
			if args := logging.TraceArgs(projectID, req.Header.Get("X-Cloud-Trace-Context")); len(args) > 0 {
				logger = logger.With(args...)
			}
			c.SetRequest(req.WithContext(logging.WithLogger(req.Context(), logger)))

			start := time.Now()
			err := next(c)
			if err != nil {
				// Let echo's error handler write the response now so the
				// logged status is the one actually sent. The handler skips
				// double writes via Response().Committed, so returning err
				// afterwards is safe.
				c.Error(err)
			}

			status := c.Response().Status
			if healthPaths[c.Path()] && status < 400 {
				return err
			}

			// 下流のミドルウェアがロガーを enrich していることがあるので
			// （admin 認証の admin_id 付与など）、出力直前に引き直す
			logger = logging.FromContext(c.Request().Context())

			level := slog.LevelInfo
			switch {
			case status >= 500:
				level = slog.LevelError
			case status >= 400:
				level = slog.LevelWarn
			}
			attrs := []slog.Attr{
				slog.String("method", req.Method),
				slog.String("uri", req.RequestURI),
				slog.Int("status", status),
				slog.String("latency", time.Since(start).String()),
				slog.String("remote_ip", c.RealIP()),
			}
			if err != nil {
				attrs = append(attrs, slog.String("error", err.Error()))
			}
			logger.LogAttrs(req.Context(), level, "request", attrs...)
			return err
		}
	}
}
