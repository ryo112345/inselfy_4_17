package initializer

import (
	"encoding/json"
	"net/http"
)

// strictRouter is the server's router: a Go 1.22 ServeMux serving the
// strict-server handlers plus the spec-external routes (WS, uploads, stripe
// webhook, health). Registered patterns are recorded so spec_drift_test.go
// can enumerate them (ServeMux has no public API for that).
//
// It is two-tiered: ServeMux has no "static segment beats wildcard" rule and
// panics on patterns like GET /api/users/id/{id} vs
// GET /api/users/{username}/experiences ("/api/users/id/experiences" matches
// both). echo resolved these statically-prefixed routes first, so routes that
// would conflict on the main mux go onto the priority mux, which is consulted
// first.
type strictRouter struct {
	priority *http.ServeMux
	mux      *http.ServeMux
	patterns []string
}

func newStrictRouter() *strictRouter {
	return &strictRouter{priority: http.NewServeMux(), mux: http.NewServeMux()}
}

// handle registers a "METHOD /path/{param}" pattern on the main mux.
func (sr *strictRouter) handle(pattern string, h http.HandlerFunc) {
	sr.mux.HandleFunc(pattern, h)
	sr.patterns = append(sr.patterns, pattern)
}

// handleFirst registers a pattern on the priority mux: use it for routes a
// plain ServeMux would reject as ambiguous against a wildcard sibling
// (echo's static-over-param precedence).
func (sr *strictRouter) handleFirst(pattern string, h http.HandlerFunc) {
	sr.priority.HandleFunc(pattern, h)
	sr.patterns = append(sr.patterns, pattern)
}

// ServeHTTP consults the priority mux first, then the main mux. Requests
// matching no pattern get the echo-style JSON 404/405 body (frontend error
// handling parses JSON bodies, so the ServeMux plain-text default would be a
// behavior change).
func (sr *strictRouter) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if _, pattern := sr.priority.Handler(r); pattern != "" {
		sr.priority.ServeHTTP(w, r)
		return
	}
	fallback, pattern := sr.mux.Handler(r)
	if pattern != "" {
		sr.mux.ServeHTTP(w, r)
		return
	}
	// fallback is ServeMux's own responder for unmatched requests: a 404, a
	// 405 (with Allow), or a 301 to the canonical/cleaned path (with
	// Location). Probe its verdict, keep its headers, and swap the plain-text
	// 404/405 body for the JSON body echo used to send.
	probe := &muxErrorProbe{header: make(http.Header)}
	fallback.ServeHTTP(probe, r)
	status := probe.status
	if status == 0 {
		status = http.StatusNotFound
	}
	for key, values := range probe.header {
		if key == "Content-Type" || key == "Content-Length" {
			continue // body is replaced below
		}
		w.Header()[key] = values
	}
	writeJSON(w, status, map[string]string{"message": http.StatusText(status)})
}

// muxErrorProbe captures the status and headers ServeMux's fallback handler
// would send, discarding the plain-text body.
type muxErrorProbe struct {
	header http.Header
	status int
}

func (p *muxErrorProbe) Header() http.Header { return p.header }

func (p *muxErrorProbe) WriteHeader(status int) {
	if p.status == 0 {
		p.status = status
	}
}

func (p *muxErrorProbe) Write(b []byte) (int, error) {
	if p.status == 0 {
		p.status = http.StatusOK
	}
	return len(b), nil
}

// writeJSON renders a JSON response for the driver-layer handlers (health,
// uploads, router fallbacks) that do not go through the strict wrapper.
func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}
