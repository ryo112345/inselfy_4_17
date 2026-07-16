package initializer

import (
	"context"

	sqlcgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc"
	httpcontroller "github.com/akiyama/inselfy/backend/internal/adapter/http/controller"
	openapigen "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
)

// wireAdmin registers the /api/admin routes plus the user-facing report
// routes that share the report controllers (AI reports on diagnosis paths and
// the integrated report) — this group is migrated to strict-server handlers
// (docs/strict-server-migration.md Phase 3-1 グループ11). Admin controllers
// stay pool-backed by design (see CLAUDE.md). All routes are guarded by the
// spec-driven auth in the OpenAPI validator: /api/admin via AdminAuth
// (X-Admin-Key: static bootstrap key or a personal token issued at
// /admin/admins, fail-closed), the user-facing report routes via their spec
// security.
func wireAdmin(ctx context.Context, sr *strictRouter, wrapper *openapigen.ServerInterfaceWrapper, ss *httpcontroller.StrictServer, d *deps) error {
	if d.cfg.InitialAdminEmail != "" {
		if err := sqlcgw.SeedAdmin(ctx, d.pool, d.cfg.InitialAdminEmail); err != nil {
			return err
		}
	}
	adminReportCtrl := httpcontroller.NewAdminReportController(d.pool)
	adminCIReportCtrl := httpcontroller.NewAdminCIReportController(d.pool)
	adminIntReportCtrl := httpcontroller.NewAdminIntegratedReportController(d.pool)
	ss.WireAdminGroup(
		httpcontroller.NewAdminAdminController(d.pool),
		httpcontroller.NewAdminUserController(d.pool, d.jwtService),
		httpcontroller.NewAdminCompanyController(d.pool, d.jwtService),
		adminReportCtrl,
		adminCIReportCtrl,
		adminIntReportCtrl,
	)

	// --- Admin: 管理者 ---
	sr.handle("GET /api/admin/admins", wrapper.AdminListAdmins)
	sr.handle("POST /api/admin/admins", wrapper.AdminCreateAdmin)
	sr.handle("POST /api/admin/admins/{adminId}/api-key", wrapper.AdminIssueAdminApiKey)
	sr.handle("DELETE /api/admin/admins/{adminId}", wrapper.AdminDeleteAdmin)

	// --- Admin: ユーザー・企業 ---
	sr.handle("GET /api/admin/users", wrapper.AdminListUsers)
	sr.handle("DELETE /api/admin/users/{userId}", wrapper.AdminDeleteUser)
	sr.handle("POST /api/admin/users/{userId}/bypass-login", wrapper.AdminBypassLoginAsUser)
	sr.handle("GET /api/admin/companies", wrapper.AdminListCompanies)
	sr.handle("PATCH /api/admin/companies/{companyId}/status", wrapper.AdminUpdateCompanyStatus)
	sr.handle("POST /api/admin/companies/{companyId}/bypass-login", wrapper.AdminBypassLoginAsCompany)

	// --- Admin: WV レポート ---
	sr.handle("GET /api/admin/reports/pending", wrapper.AdminListPendingWvSessions)
	sr.handle("GET /api/admin/reports/list", wrapper.AdminListWvReports)
	sr.handle("POST /api/admin/sessions/{sessionId}/reset-viewed", wrapper.AdminResetWvReportViewed)
	sr.handle("PUT /api/admin/sessions/{sessionId}/ai-report", wrapper.AdminSaveWvReport)
	sr.handle("GET /api/admin/sessions/{sessionId}/ai-report", wrapper.AdminGetWvReport)
	sr.handle("GET /api/admin/sessions/{sessionId}/scores", wrapper.AdminGetWvSessionScores)
	sr.handle("GET /api/admin/sessions/{sessionId}/prompt", wrapper.AdminGetWvPrompt)

	// --- Admin: CI レポート ---
	sr.handle("GET /api/admin/ci-reports/pending", wrapper.AdminListPendingCiSessions)
	sr.handle("GET /api/admin/ci-reports/list", wrapper.AdminListCiReports)
	sr.handle("POST /api/admin/ci-sessions/{sessionId}/reset-viewed", wrapper.AdminResetCiReportViewed)
	sr.handle("PUT /api/admin/ci-sessions/{sessionId}/ai-report", wrapper.AdminSaveCiReport)
	sr.handle("GET /api/admin/ci-sessions/{sessionId}/ai-report", wrapper.AdminGetCiReport)
	sr.handle("GET /api/admin/ci-sessions/{sessionId}/prompt", wrapper.AdminGetCiPrompt)

	// --- AI Report (user-facing) ---
	sr.handle("GET /api/work-values/sessions/{sessionId}/ai-report", wrapper.WorkValuesWvGetAiReport)
	sr.handle("GET /api/career-interest/sessions/{sessionId}/ai-report", wrapper.CareerInterestCiGetAiReport)

	// --- Admin: 統合レポート ---
	sr.handle("GET /api/admin/integrated-reports/pending", wrapper.AdminListPendingIntegratedRequests)
	sr.handle("GET /api/admin/integrated-reports/list", wrapper.AdminListIntegratedReports)
	sr.handle("POST /api/admin/integrated-requests/{requestId}/reset-viewed", wrapper.AdminResetIntegratedReportViewed)
	sr.handle("PUT /api/admin/integrated-requests/{requestId}/ai-report", wrapper.AdminSaveIntegratedReport)
	sr.handle("GET /api/admin/integrated-requests/{requestId}/ai-report", wrapper.AdminGetIntegratedReportAsAdmin)
	sr.handle("GET /api/admin/integrated-requests/{requestId}/prompt", wrapper.AdminGetIntegratedPrompt)

	// --- 統合レポート (user-facing) ---
	sr.handle("POST /api/integrated-report/requests", wrapper.IntegratedReportCreateIntegratedReportRequest)
	sr.handle("GET /api/integrated-report/me", wrapper.IntegratedReportGetMyIntegratedReport)
	sr.handle("GET /api/integrated-report/status", wrapper.IntegratedReportGetIntegratedReportStatus)
	sr.handle("GET /api/integrated-report/requests/{requestId}/report", wrapper.IntegratedReportGetIntegratedReport)
	sr.handle("GET /api/integrated-report/users/{userId}/latest-request", wrapper.IntegratedReportGetLatestIntegratedRequest)

	return nil
}
