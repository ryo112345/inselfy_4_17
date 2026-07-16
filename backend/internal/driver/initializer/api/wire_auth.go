package initializer

import (
	"github.com/labstack/echo/v4"

	bcryptgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/bcrypt"
	sqlcgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc"
	googlegw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/google"
	httpcontroller "github.com/akiyama/inselfy/backend/internal/adapter/http/controller"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

// wireAuth registers candidate (Google OAuth) and company (email/password)
// authentication routes.
func wireAuth(e *echo.Echo, d *deps) {
	authCtrl := httpcontroller.NewAuthController(usecase.NewAuthInteractor(
		d.userRepo, sqlcgw.NewRefreshTokenRepository(d.pool), googlegw.NewTokenVerifier(), d.jwtService, d.cfg.GoogleClientID,
	))
	companyAuthCtrl := httpcontroller.NewCompanyAuthController(usecase.NewCompanyAuthInteractor(
		sqlcgw.NewCompanyAccountRepository(d.pool),
		sqlcgw.NewCompanyRefreshTokenRepository(d.pool),
		d.jwtService,
		bcryptgw.NewService(),
	))

	// --- Company Auth ---
	companyAuthGroup := e.Group("/api/company/auth")
	companyAuthGroup.POST("/register", companyAuthCtrl.Register)
	companyAuthGroup.POST("/login", companyAuthCtrl.Login)
	companyAuthGroup.POST("/refresh", companyAuthCtrl.Refresh)
	companyAuthGroup.POST("/logout", companyAuthCtrl.Logout)
	companyAuthGroup.GET("/me", companyAuthCtrl.GetMe)

	// --- Auth (public) ---
	authGroup := e.Group("/api/auth")
	authGroup.POST("/google", authCtrl.GoogleLogin)
	authGroup.POST("/refresh", authCtrl.Refresh)
	authGroup.POST("/logout", authCtrl.Logout)
	authGroup.GET("/me", authCtrl.GetMe)
}
