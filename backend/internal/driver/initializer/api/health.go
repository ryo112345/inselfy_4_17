package initializer

import (
	"context"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// wireHealth registers infra-level health endpoints. These carry no business
// logic, so they are wired here in the driver layer instead of going through
// controller → InputPort.
//
//   - /healthz: liveness  — プロセスが応答できるか（DB は見ない）。
//   - /readyz:  readiness — DB へ ping が通り、リクエストを受けられる状態か。
//
// ルート直下（8081 直叩き）は compose / e2e-smoke.sh が使う。
// Cloud Run の probe は port 8080（Next.js）にしか届かないため、
// front の catch-all proxy（/api/* → 8081 へフルパス転送）を通る
// /api/ プレフィックス版も登録する（C10 の startup/liveness probe が使う）。
func wireHealth(sr *strictRouter, pool *pgxpool.Pool) {
	livez := func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}
	readyz := func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		if err := pool.Ping(ctx); err != nil {
			writeJSON(w, http.StatusServiceUnavailable, map[string]string{"status": "unavailable", "reason": "db ping failed"})
			return
		}
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	}
	sr.handle("GET /healthz", livez)
	sr.handle("GET /readyz", readyz)
	sr.handle("GET /api/healthz", livez)
	sr.handle("GET /api/readyz", readyz)
}
