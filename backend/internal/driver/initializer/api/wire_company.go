package initializer

import (
	"github.com/labstack/echo/v4"

	sqlcgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc"
	httpcontroller "github.com/akiyama/inselfy/backend/internal/adapter/http/controller"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

// wireCompany registers company-side routes: profile (public + authenticated),
// teams (public scores + management), talent search, and saved candidates.
func wireCompany(e *echo.Echo, d *deps) {
	companyProfileGw := sqlcgw.NewCompanyProfileGateway(d.pool)
	companyProfileCtrl := httpcontroller.NewCompanyProfileController(
		usecase.NewCompanyProfileInteractor(companyProfileGw, companyProfileGw),
		d.fileStorage,
	)
	teamCtrl := httpcontroller.NewCompanyTeamController(
		usecase.NewCompanyTeamInteractor(
			sqlcgw.NewCompanyTeamRepository(d.pool),
			sqlcgw.NewCompanyTeamQueryService(d.pool),
			d.tx,
		),
	)

	// --- Company Profile (public) ---
	e.GET("/api/companies/:id", func(c echo.Context) error {
		return companyProfileCtrl.GetPublicProfile(c)
	})

	// --- Company Teams (public) ---
	e.GET("/api/companies/:id/teams/scores", func(c echo.Context) error {
		return teamCtrl.GetPublicTeamScores(c, c.Param("id"))
	})

	// --- Company Profile (authenticated) ---
	companyProfileGroup := e.Group("/api/company/profile")
	companyProfileGroup.GET("", companyProfileCtrl.GetProfile)
	companyProfileGroup.PUT("", companyProfileCtrl.UpdateProfile)
	companyProfileGroup.POST("/image", companyProfileCtrl.UploadImage)
	companyProfileGroup.DELETE("/image", companyProfileCtrl.DeleteImage)

	// --- Company Teams ---
	teamGroup := e.Group("/api/company/teams")
	teamGroup.GET("", teamCtrl.ListTeams)
	teamGroup.POST("", teamCtrl.CreateTeam)
	teamGroup.GET("/:teamId", func(c echo.Context) error {
		return teamCtrl.GetTeam(c, c.Param("teamId"))
	})
	teamGroup.PUT("/:teamId", func(c echo.Context) error {
		return teamCtrl.UpdateTeam(c, c.Param("teamId"))
	})
	teamGroup.DELETE("/:teamId", func(c echo.Context) error {
		return teamCtrl.DeleteTeam(c, c.Param("teamId"))
	})
	teamGroup.POST("/:teamId/members", func(c echo.Context) error {
		return teamCtrl.AddMember(c, c.Param("teamId"))
	})
	teamGroup.DELETE("/:teamId/members/:memberId", func(c echo.Context) error {
		return teamCtrl.RemoveMember(c, c.Param("teamId"), c.Param("memberId"))
	})
	teamGroup.GET("/:teamId/scores", func(c echo.Context) error {
		return teamCtrl.GetTeamScores(c, c.Param("teamId"))
	})
	teamGroup.PUT("/:teamId/ace/:memberId", func(c echo.Context) error {
		return teamCtrl.SetAceMember(c, c.Param("teamId"), c.Param("memberId"))
	})
	teamGroup.DELETE("/:teamId/ace", func(c echo.Context) error {
		return teamCtrl.UnsetAceMember(c, c.Param("teamId"))
	})

	// --- Talent Search ---
	talentCtrl := httpcontroller.NewTalentSearchController(
		usecase.NewTalentSearchInteractor(sqlcgw.NewTalentSearchQueryService(d.pool)),
	)
	talentGroup := e.Group("/api/company/talents")
	talentGroup.GET("/search", talentCtrl.Search)
	talentGroup.GET("/search/diagnostic", talentCtrl.DiagnosticSearch)
	talentGroup.GET("/search/diagnostic/ci", talentCtrl.CIDiagnosticSearch)
	talentGroup.GET("/search/diagnostic/integrated", talentCtrl.IntegratedDiagnosticSearch)

	// --- Saved Candidates ---
	savedCandCtrl := httpcontroller.NewSavedCandidateController(
		usecase.NewSavedCandidateInteractor(sqlcgw.NewSavedCandidateRepository(d.pool), sqlcgw.NewSavedCandidateQueryService(d.pool)),
	)
	savedCandGroup := e.Group("/api/company/saved-candidates")
	savedCandGroup.GET("", savedCandCtrl.List)
	savedCandGroup.GET("/count", savedCandCtrl.Count)
	savedCandGroup.POST("/bulk-check", savedCandCtrl.BulkCheck)
	savedCandGroup.POST("/:userId", func(c echo.Context) error {
		return savedCandCtrl.Save(c)
	})
	savedCandGroup.DELETE("/:userId", func(c echo.Context) error {
		return savedCandCtrl.Unsave(c)
	})
	savedCandGroup.GET("/:userId", func(c echo.Context) error {
		return savedCandCtrl.IsSaved(c)
	})
}
