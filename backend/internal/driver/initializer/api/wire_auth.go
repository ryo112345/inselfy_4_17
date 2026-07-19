package initializer

import (
	bcryptgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/bcrypt"
	sqlcgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc"
	googlegw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/google"
	httpcontroller "github.com/akiyama/inselfy/backend/internal/adapter/http/controller"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

// wireAuth assembles the candidate (Google OAuth) and company
// (email/password) authentication controllers. cookie の発行/削除は
// controller の Visitor ラッパーが担う。
func wireAuth(ss *httpcontroller.StrictServer, d *deps) {
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
}
