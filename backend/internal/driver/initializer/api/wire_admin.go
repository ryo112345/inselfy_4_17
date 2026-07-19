package initializer

import (
	"context"

	sqlcgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc"
	httpcontroller "github.com/akiyama/inselfy/backend/internal/adapter/http/controller"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

// wireAdmin assembles the /api/admin controllers plus the user-facing report
// controllers that share them (AI reports on diagnosis paths and the
// integrated report). Admin controllers stay pool-backed by design (see
// CLAUDE.md); the resume approve action is the exception and goes through
// ResumeInteractor because it rewrites the candidate profile via the port
// repositories in one transaction. All routes are guarded by the spec-driven
// auth in the OpenAPI validator: /api/admin via AdminAuth (X-Admin-Key:
// static bootstrap key or a personal token issued at /admin/admins,
// fail-closed), the user-facing report routes via their spec security.
func wireAdmin(ctx context.Context, sr *strictRouter, ss *httpcontroller.StrictServer, d *deps) error {
	if d.cfg.InitialAdminEmail != "" {
		if err := sqlcgw.SeedAdmin(ctx, d.pool, d.cfg.InitialAdminEmail); err != nil {
			return err
		}
	}
	adminResumeCtrl := httpcontroller.NewAdminResumeController(d.pool, d.privateStorage, newResumeInteractor(d))
	ss.WireAdminGroup(
		httpcontroller.NewAdminAdminController(d.pool),
		httpcontroller.NewAdminUserController(d.pool, d.jwtService),
		httpcontroller.NewAdminCompanyController(d.pool, d.jwtService),
		httpcontroller.NewAdminReportController(d.pool),
		httpcontroller.NewAdminCIReportController(d.pool),
		httpcontroller.NewAdminIntegratedReportController(d.pool),
		adminResumeCtrl,
	)

	// CLAUDE.md のワークフロー契約（json デコードエラーをそのまま返す）のため
	// strict を経由しない（wire_user.go の PATCH /api/users/{username} と同じ
	// 3-3 例外パターン。契約検証は上流の OpenAPI validator が担う）。
	sr.handleOverride("PUT /api/admin/resumes/{resumeId}/draft", adminResumeCtrl.SaveDraftHTTP)
	return nil
}

// newResumeInteractor builds the ResumeInteractor shared by the candidate
// upload routes (wire_user.go) and the admin approve action.
func newResumeInteractor(d *deps) *usecase.ResumeInteractor {
	return usecase.NewResumeInteractor(
		sqlcgw.NewResumeRepository(d.pool),
		d.userRepo,
		sqlcgw.NewExperienceRepository(d.pool),
		sqlcgw.NewEducationRepository(d.pool),
		sqlcgw.NewSkillRepository(d.pool),
		d.notificationRepo,
		d.tx,
	)
}
