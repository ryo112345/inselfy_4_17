// Package logging configures the process-wide slog logger for Cloud
// Logging-compatible structured output, and carries a request-scoped logger
// (annotated with the Cloud Trace ID) through context.
package logging

import (
	"context"
	"log/slog"
	"os"
	"strings"
)

// Setup installs the default logger. On Cloud Run (K_SERVICE is set) it emits
// Cloud Logging-compatible JSON (severity/message keys); elsewhere it stays
// human-readable text. Because this goes through slog.SetDefault, plain
// log.Printf callers (ws/, scheduler/) are routed through the same handler.
func Setup() *slog.Logger {
	var handler slog.Handler
	if os.Getenv("K_SERVICE") != "" {
		handler = slog.NewJSONHandler(os.Stderr, &slog.HandlerOptions{ReplaceAttr: replaceAttr})
	} else {
		handler = slog.NewTextHandler(os.Stderr, nil)
	}
	logger := slog.New(handler)
	slog.SetDefault(logger)
	return logger
}

// replaceAttr renames slog's default keys to the fields Cloud Logging
// recognizes: level -> severity (WARN -> WARNING), msg -> message.
func replaceAttr(groups []string, a slog.Attr) slog.Attr {
	if len(groups) > 0 {
		return a
	}
	switch a.Key {
	case slog.LevelKey:
		a.Key = "severity"
		if level, ok := a.Value.Any().(slog.Level); ok && level == slog.LevelWarn {
			a.Value = slog.StringValue("WARNING")
		}
	case slog.MessageKey:
		a.Key = "message"
	}
	return a
}

// TraceArgs parses an X-Cloud-Trace-Context header ("TRACE_ID/SPAN_ID;o=1")
// into the slog arg that makes Cloud Logging associate the entry with the
// request's trace. Empty when projectID or the header is missing (local dev).
func TraceArgs(projectID, header string) []any {
	if projectID == "" || header == "" {
		return nil
	}
	traceID, _, _ := strings.Cut(header, "/")
	if traceID == "" {
		return nil
	}
	return []any{slog.String("logging.googleapis.com/trace", "projects/"+projectID+"/traces/"+traceID)}
}

type ctxKey struct{}

// holder makes the request-scoped logger replaceable in place: downstream
// middleware can enrich it (SetLogger) and the upstream access-log middleware
// — which only holds the original context — still sees the enriched logger.
// Requests are handled by a single goroutine, so no synchronization is needed.
type holder struct{ logger *slog.Logger }

// WithLogger returns a context carrying l as the request-scoped logger.
func WithLogger(ctx context.Context, l *slog.Logger) context.Context {
	return context.WithValue(ctx, ctxKey{}, &holder{logger: l})
}

// SetLogger replaces the request-scoped logger for the whole request: both
// downstream handlers and the upstream access-log emission observe l. No-op
// when ctx does not come from WithLogger (background goroutines, tests).
func SetLogger(ctx context.Context, l *slog.Logger) {
	if h, ok := ctx.Value(ctxKey{}).(*holder); ok {
		h.logger = l
	}
}

// FromContext returns the request-scoped logger, falling back to the default
// logger outside a request (background goroutines, tests).
func FromContext(ctx context.Context) *slog.Logger {
	if h, ok := ctx.Value(ctxKey{}).(*holder); ok {
		return h.logger
	}
	return slog.Default()
}
