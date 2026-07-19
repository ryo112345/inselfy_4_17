package middleware

import (
	"encoding/json"
	"net/http"
)

// statusRecorder captures the response status code for access logging and
// panic recovery. Unwrap exposes the underlying writer so
// http.ResponseController (and coder/websocket's hijack for the WS upgrade)
// keep working through the wrapper.
type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(code int) {
	if r.status == 0 {
		r.status = code
	}
	r.ResponseWriter.WriteHeader(code)
}

func (r *statusRecorder) Write(b []byte) (int, error) {
	if r.status == 0 {
		r.status = http.StatusOK
	}
	return r.ResponseWriter.Write(b)
}

func (r *statusRecorder) Unwrap() http.ResponseWriter { return r.ResponseWriter }

// Status returns the sent status, defaulting to 200 when the handler wrote
// nothing explicitly (mirrors net/http's implicit 200).
func (r *statusRecorder) Status() int {
	if r.status == 0 {
		return http.StatusOK
	}
	return r.status
}

// committed reports whether a status line was already sent.
func (r *statusRecorder) committed() bool { return r.status != 0 }

// writeJSONError renders the canonical JSON error bodies emitted by the
// middleware chain (validator 400/401, recover 500).
func writeJSONError(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
