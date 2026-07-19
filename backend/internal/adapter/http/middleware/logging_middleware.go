package middleware

import (
	"log/slog"
	"net"
	"net/http"
	"strings"
	"time"

	"github.com/akiyama/inselfy/backend/internal/driver/logging"
)

// Cloud Run の probe が数秒おきに叩くため、成功時はアクセスログを出さない
var healthPaths = map[string]bool{
	"/healthz":     true,
	"/readyz":      true,
	"/api/healthz": true,
	"/api/readyz":  true,
}

// RequestLogging emits one structured slog entry per request and stores a
// request-scoped logger in the request context (retrieve with
// logging.FromContext, enrich in place with logging.SetLogger). On Cloud Run
// the logger carries the Cloud Trace ID, so app logs and access logs of the
// same request line up in Cloud Logging.
func RequestLogging(projectID string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			logger := slog.Default()
			if args := logging.TraceArgs(projectID, r.Header.Get("X-Cloud-Trace-Context")); len(args) > 0 {
				logger = logger.With(args...)
			}
			ctx := logging.WithLogger(r.Context(), logger)
			r = r.WithContext(ctx)

			rec := &statusRecorder{ResponseWriter: w}
			start := time.Now()
			next.ServeHTTP(rec, r)

			status := rec.Status()
			if healthPaths[r.URL.Path] && status < 400 {
				return
			}

			// 下流のミドルウェアがロガーを enrich していることがあるので
			// （admin 認証の admin_id 付与など）、出力直前に引き直す
			logger = logging.FromContext(ctx)

			level := slog.LevelInfo
			switch {
			case status >= 500:
				level = slog.LevelError
			case status >= 400:
				level = slog.LevelWarn
			}
			logger.LogAttrs(ctx, level, "request",
				slog.String("method", r.Method),
				slog.String("uri", r.RequestURI),
				slog.Int("status", status),
				slog.String("latency", time.Since(start).String()),
				slog.String("remote_ip", realIP(r)),
			)
		})
	}
}

// realIP mirrors echo's default c.RealIP(): first X-Forwarded-For hop, then
// X-Real-Ip, then the connection's remote address.
func realIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		ip, _, _ := strings.Cut(xff, ",")
		if ip = strings.TrimSpace(ip); ip != "" {
			return ip
		}
	}
	if ip := r.Header.Get("X-Real-Ip"); ip != "" {
		return ip
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
