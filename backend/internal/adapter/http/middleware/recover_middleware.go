package middleware

import (
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"runtime/debug"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/driver/logging"
)

// Recover converts handler panics into a 500 JSON response instead of killing
// the connection (echomw.Recover 相当). http.ErrAbortHandler is re-panicked so
// net/http's deliberate connection-abort semantics stay intact.
func Recover() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			rec := &statusRecorder{ResponseWriter: w}
			defer func() {
				p := recover()
				if p == nil {
					return
				}
				if err, ok := p.(error); ok && errors.Is(err, http.ErrAbortHandler) {
					panic(p)
				}
				logging.FromContext(r.Context()).LogAttrs(r.Context(), slog.LevelError, "panic recovered",
					slog.String("panic", fmt.Sprintf("%v", p)),
					slog.String("stack", string(debug.Stack())),
				)
				if !rec.committed() {
					writeJSONError(rec, http.StatusInternalServerError,
						openapi.ModelsErrorResponse{Code: "INTERNAL", Message: "internal server error"})
				}
			}()
			next.ServeHTTP(rec, r)
		})
	}
}
