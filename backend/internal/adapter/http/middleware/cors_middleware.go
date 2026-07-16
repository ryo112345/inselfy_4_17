package middleware

import (
	"net/http"
	"slices"
	"strings"
)

// CORSConfig mirrors the subset of echomw.CORSConfig this API uses:
// a credentialed exact-match origin allowlist.
type CORSConfig struct {
	AllowOrigins []string
	AllowMethods []string
	AllowHeaders []string
}

// CORS replicates echomw.CORSWithConfig's behavior: ACAO echoes the matched
// origin (never "*", credentials are allowed), preflight requests are
// terminated with 204 whether or not the origin is allowed, and non-CORS /
// disallowed-origin requests pass through without CORS headers.
func CORS(cfg CORSConfig) func(http.Handler) http.Handler {
	allowMethods := strings.Join(cfg.AllowMethods, ",")
	allowHeaders := strings.Join(cfg.AllowHeaders, ",")
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")
			preflight := r.Method == http.MethodOptions
			w.Header().Add("Vary", "Origin")

			if origin == "" || !slices.Contains(cfg.AllowOrigins, origin) {
				if preflight {
					w.WriteHeader(http.StatusNoContent)
					return
				}
				next.ServeHTTP(w, r)
				return
			}

			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Credentials", "true")
			if !preflight {
				next.ServeHTTP(w, r)
				return
			}
			w.Header().Add("Vary", "Access-Control-Request-Method")
			w.Header().Add("Vary", "Access-Control-Request-Headers")
			w.Header().Set("Access-Control-Allow-Methods", allowMethods)
			w.Header().Set("Access-Control-Allow-Headers", allowHeaders)
			w.WriteHeader(http.StatusNoContent)
		})
	}
}
