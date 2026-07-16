package initializer

import (
	"context"

	sqlcgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc"
	httpcontroller "github.com/akiyama/inselfy/backend/internal/adapter/http/controller"
)

// wireAdmin assembles the /api/admin controllers plus the user-facing report
// controllers that share them (AI reports on diagnosis paths and the
// integrated report). Admin controllers stay pool-backed by design (see
// CLAUDE.md). All routes are guarded by the spec-driven auth in the OpenAPI
// validator: /api/admin via AdminAuth (X-Admin-Key: static bootstrap key or a
// personal token issued at /admin/admins, fail-closed), the user-facing
// report routes via their spec security.
func wireAdmin(ctx context.Context, ss *httpcontroller.StrictServer, d *deps) error {
	if d.cfg.InitialAdminEmail != "" {
		if err := sqlcgw.SeedAdmin(ctx, d.pool, d.cfg.InitialAdminEmail); err != nil {
			return err
		}
	}
	ss.WireAdminGroup(
		httpcontroller.NewAdminAdminController(d.pool),
		httpcontroller.NewAdminUserController(d.pool, d.jwtService),
		httpcontroller.NewAdminCompanyController(d.pool, d.jwtService),
		httpcontroller.NewAdminReportController(d.pool),
		httpcontroller.NewAdminCIReportController(d.pool),
		httpcontroller.NewAdminIntegratedReportController(d.pool),
	)
	return nil
}
