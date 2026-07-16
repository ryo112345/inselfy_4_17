package initializer

import (
	"context"

	"github.com/labstack/echo/v4"

	sqlcgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc"
	httpcontroller "github.com/akiyama/inselfy/backend/internal/adapter/http/controller"
)

// wireAdmin registers the /api/admin routes plus the user-facing report
// routes that share the report controllers (AI reports on diagnosis paths and
// the integrated report). Admin controllers stay pool-backed by design (see
// CLAUDE.md). All routes here are guarded by the spec-driven auth in the
// OpenAPI validator: /api/admin via AdminAuth (X-Admin-Key: static bootstrap
// key or a personal token issued at /admin/admins, fail-closed), the
// user-facing report routes via their spec security.
func wireAdmin(ctx context.Context, e *echo.Echo, d *deps) error {
	if d.cfg.InitialAdminEmail != "" {
		if err := sqlcgw.SeedAdmin(ctx, d.pool, d.cfg.InitialAdminEmail); err != nil {
			return err
		}
	}
	adminUserCtrl := httpcontroller.NewAdminUserController(d.pool, d.jwtService)
	adminReportCtrl := httpcontroller.NewAdminReportController(d.pool)
	adminCompanyCtrl := httpcontroller.NewAdminCompanyController(d.pool, d.jwtService)
	adminAdminCtrl := httpcontroller.NewAdminAdminController(d.pool)
	// X-Admin-Key の検証はスペック駆動認可（openapi_validator.go の AdminAuth
	// 分岐）が行うため、per-route の認証MWは無い。
	adminGroup := e.Group("/api/admin")
	adminGroup.GET("/admins", adminAdminCtrl.List)
	adminGroup.POST("/admins", adminAdminCtrl.Create)
	adminGroup.POST("/admins/:id/api-key", func(c echo.Context) error {
		return adminAdminCtrl.IssueKey(c, c.Param("id"))
	})
	adminGroup.DELETE("/admins/:id", func(c echo.Context) error {
		return adminAdminCtrl.Delete(c, c.Param("id"))
	})
	adminGroup.GET("/users", adminUserCtrl.List)
	adminGroup.GET("/companies", adminCompanyCtrl.List)
	adminGroup.PATCH("/companies/:id/status", func(c echo.Context) error {
		return adminCompanyCtrl.UpdateStatus(c, c.Param("id"))
	})
	adminGroup.POST("/companies/:id/bypass-login", func(c echo.Context) error {
		return adminCompanyCtrl.BypassLogin(c, c.Param("id"))
	})
	adminGroup.DELETE("/users/:id", func(c echo.Context) error {
		return adminUserCtrl.Delete(c, c.Param("id"))
	})
	adminGroup.POST("/users/:id/bypass-login", func(c echo.Context) error {
		return adminUserCtrl.BypassLogin(c, c.Param("id"))
	})
	adminGroup.GET("/reports/pending", adminReportCtrl.ListPending)
	adminGroup.GET("/reports/list", adminReportCtrl.ListReports)
	adminGroup.POST("/sessions/:sessionId/reset-viewed", func(c echo.Context) error {
		return adminReportCtrl.ResetViewed(c, c.Param("sessionId"))
	})
	adminGroup.PUT("/sessions/:sessionId/ai-report", func(c echo.Context) error {
		return adminReportCtrl.SaveReport(c, c.Param("sessionId"))
	})
	adminGroup.GET("/sessions/:sessionId/ai-report", func(c echo.Context) error {
		return adminReportCtrl.GetReport(c, c.Param("sessionId"))
	})
	adminGroup.GET("/sessions/:sessionId/scores", func(c echo.Context) error {
		return adminReportCtrl.GetSessionScores(c, c.Param("sessionId"))
	})
	adminGroup.GET("/sessions/:sessionId/prompt", func(c echo.Context) error {
		return adminReportCtrl.GetPrompt(c, c.Param("sessionId"))
	})

	// --- Admin CI Reports ---
	adminCIReportCtrl := httpcontroller.NewAdminCIReportController(d.pool)
	adminGroup.GET("/ci-reports/pending", adminCIReportCtrl.ListPending)
	adminGroup.GET("/ci-reports/list", adminCIReportCtrl.ListReports)
	adminGroup.POST("/ci-sessions/:sessionId/reset-viewed", func(c echo.Context) error {
		return adminCIReportCtrl.ResetViewed(c, c.Param("sessionId"))
	})
	adminGroup.PUT("/ci-sessions/:sessionId/ai-report", func(c echo.Context) error {
		return adminCIReportCtrl.SaveReport(c, c.Param("sessionId"))
	})
	adminGroup.GET("/ci-sessions/:sessionId/ai-report", func(c echo.Context) error {
		return adminCIReportCtrl.GetReport(c, c.Param("sessionId"))
	})
	adminGroup.GET("/ci-sessions/:sessionId/prompt", func(c echo.Context) error {
		return adminCIReportCtrl.GetPrompt(c, c.Param("sessionId"))
	})

	// --- AI Report (user-facing) ---
	e.GET("/api/work-values/sessions/:sessionId/ai-report", func(c echo.Context) error {
		return adminReportCtrl.GetReport(c, c.Param("sessionId"))
	})
	e.GET("/api/career-interest/sessions/:sessionId/ai-report", func(c echo.Context) error {
		return adminCIReportCtrl.GetReport(c, c.Param("sessionId"))
	})

	// --- Admin Integrated Reports ---
	adminIntReportCtrl := httpcontroller.NewAdminIntegratedReportController(d.pool)
	adminGroup.GET("/integrated-reports/pending", adminIntReportCtrl.ListPending)
	adminGroup.GET("/integrated-reports/list", adminIntReportCtrl.ListReports)
	adminGroup.POST("/integrated-requests/:requestId/reset-viewed", func(c echo.Context) error {
		return adminIntReportCtrl.ResetViewed(c, c.Param("requestId"))
	})
	adminGroup.PUT("/integrated-requests/:requestId/ai-report", func(c echo.Context) error {
		return adminIntReportCtrl.SaveReport(c, c.Param("requestId"))
	})
	adminGroup.GET("/integrated-requests/:requestId/ai-report", func(c echo.Context) error {
		return adminIntReportCtrl.GetReport(c, c.Param("requestId"))
	})
	adminGroup.GET("/integrated-requests/:requestId/prompt", func(c echo.Context) error {
		return adminIntReportCtrl.GetPrompt(c, c.Param("requestId"))
	})

	// --- Integrated Report (user-facing) ---
	intGroup := e.Group("/api/integrated-report")
	intGroup.POST("/requests", adminIntReportCtrl.CreateRequest)
	intGroup.GET("/me", adminIntReportCtrl.GetReportByUser)
	intGroup.GET("/status", adminIntReportCtrl.GetRequestStatus)
	intGroup.GET("/requests/:requestId/report", func(c echo.Context) error {
		return adminIntReportCtrl.GetReport(c, c.Param("requestId"))
	})
	intGroup.GET("/users/:userId/latest-request", func(c echo.Context) error {
		return adminIntReportCtrl.GetLatestRequest(c, c.Param("userId"))
	})

	return nil
}
