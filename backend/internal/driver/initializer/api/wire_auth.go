package initializer

import (
	bcryptgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/bcrypt"
	sqlcgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc"
	googlegw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/google"
	httpcontroller "github.com/akiyama/inselfy/backend/internal/adapter/http/controller"
	openapigen "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

// wireAuth registers candidate (Google OAuth) and company (email/password)
// authentication routes on the strict mux — this group is migrated to
// strict-server handlers (docs/strict-server-migration.md Phase 3-1 グループ5).
// cookie の発行/削除は controller の Visitor ラッパーが担う。
func wireAuth(sr *strictRouter, wrapper *openapigen.ServerInterfaceWrapper, ss *httpcontroller.StrictServer, d *deps) {
	ss.WireAuthGroup(
		httpcontroller.NewAuthController(usecase.NewAuthInteractor(
			d.userRepo, sqlcgw.NewRefreshTokenRepository(d.pool), googlegw.NewTokenVerifier(), d.jwtService, d.cfg.GoogleClientID,
		)),
		httpcontroller.NewCompanyAuthController(usecase.NewCompanyAuthInteractor(
			sqlcgw.NewCompanyAccountRepository(d.pool),
			sqlcgw.NewCompanyRefreshTokenRepository(d.pool),
			d.jwtService,
			bcryptgw.NewService(),
		)),
	)

	// --- Auth (候補者) ---
	sr.handle("POST /api/auth/google", wrapper.AuthGoogleLogin)
	sr.handle("POST /api/auth/refresh", wrapper.AuthRefreshToken)
	sr.handle("POST /api/auth/logout", wrapper.AuthLogout)
	sr.handle("GET /api/auth/me", wrapper.AuthGetMe)

	// --- Company Auth ---
	sr.handle("POST /api/company/auth/register", wrapper.CompanyAuthCompanyRegister)
	sr.handle("POST /api/company/auth/login", wrapper.CompanyAuthCompanyLogin)
	sr.handle("POST /api/company/auth/refresh", wrapper.CompanyAuthCompanyRefreshToken)
	sr.handle("POST /api/company/auth/logout", wrapper.CompanyAuthCompanyLogout)
	sr.handle("GET /api/company/auth/me", wrapper.CompanyAuthCompanyGetMe)
}
