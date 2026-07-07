package initializer

import (
	"context"
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"
)

// wireHealth registers infra-level health endpoints. These carry no business
// logic, so they are wired here in the driver layer instead of going through
// controller → InputPort.
//
//   - /healthz: liveness  — プロセスが応答できるか（DB は見ない）。
//   - /readyz:  readiness — DB へ ping が通り、リクエストを受けられる状態か。
//
// コンテナ/CI のヘルスチェックと Cloud Run の probe（C10 予定）が使う。
func wireHealth(e *echo.Echo, pool *pgxpool.Pool) {
	e.GET("/healthz", func(c echo.Context) error {
		return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
	})
	e.GET("/readyz", func(c echo.Context) error {
		ctx, cancel := context.WithTimeout(c.Request().Context(), 2*time.Second)
		defer cancel()
		if err := pool.Ping(ctx); err != nil {
			return c.JSON(http.StatusServiceUnavailable, map[string]string{"status": "unavailable", "reason": "db ping failed"})
		}
		return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
	})
}
