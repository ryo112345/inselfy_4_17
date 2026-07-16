package initializer

import (
	"github.com/labstack/echo/v4"

	sqlcgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc"
	httpcontroller "github.com/akiyama/inselfy/backend/internal/adapter/http/controller"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

// wireScout registers scout routes for both sides: company sending/templates
// and candidate inbox/settings.
func wireScout(e *echo.Echo, d *deps) {
	scoutItr := usecase.NewScoutInteractor(
		d.scoutMsgRepo,
		sqlcgw.NewScoutCreditRepository(d.pool),
		sqlcgw.NewScoutCreditLedgerRepository(d.pool),
		sqlcgw.NewScoutReplyRepository(d.pool),
		sqlcgw.NewUserScoutSettingsRepository(d.pool),
		d.notificationRepo,
		d.userRepo,
		d.convRepo, d.msgRepo, d.participantRepo,
		d.tx,
	)
	scoutCtrl := httpcontroller.NewScoutController(scoutItr)
	candidateScoutCtrl := httpcontroller.NewCandidateScoutController(scoutItr, d.scoutMsgRepo, d.convRepo)
	scoutSettingsCtrl := httpcontroller.NewScoutSettingsController(scoutItr)
	scoutTemplateCtrl := httpcontroller.NewScoutTemplateController(
		usecase.NewScoutTemplateInteractor(sqlcgw.NewScoutTemplateRepository(d.pool)),
	)

	// --- Company Scouts ---
	scoutGroup := e.Group("/api/company/scouts")
	scoutGroup.POST("", scoutCtrl.Send)
	scoutGroup.GET("", scoutCtrl.List)
	scoutGroup.GET("/credits", scoutCtrl.GetCredits)
	scoutGroup.GET("/quality", scoutCtrl.GetQualityScore)
	scoutGroup.GET("/dashboard", scoutCtrl.GetDashboard)
	scoutGroup.GET("/:scoutId", func(c echo.Context) error {
		return scoutCtrl.GetDetail(c, c.Param("scoutId"))
	})
	scoutGroup.POST("/:scoutId/reply", func(c echo.Context) error {
		return scoutCtrl.Reply(c, c.Param("scoutId"))
	})

	// --- Company Scout Templates ---
	templateGroup := e.Group("/api/company/scout-templates")
	templateGroup.POST("", scoutTemplateCtrl.Create)
	templateGroup.GET("", scoutTemplateCtrl.List)
	templateGroup.GET("/:templateId", func(c echo.Context) error {
		return scoutTemplateCtrl.Get(c, c.Param("templateId"))
	})
	templateGroup.PUT("/:templateId", func(c echo.Context) error {
		return scoutTemplateCtrl.Update(c, c.Param("templateId"))
	})
	templateGroup.DELETE("/:templateId", func(c echo.Context) error {
		return scoutTemplateCtrl.Delete(c, c.Param("templateId"))
	})

	// --- Candidate Scouts ---
	candidateScoutGroup := e.Group("/api/scouts")
	candidateScoutGroup.GET("", candidateScoutCtrl.List)
	candidateScoutGroup.GET("/unread-count", candidateScoutCtrl.CountUnread)
	candidateScoutGroup.GET("/:scoutId", func(c echo.Context) error {
		return candidateScoutCtrl.GetDetail(c, c.Param("scoutId"))
	})
	candidateScoutGroup.POST("/:scoutId/respond", func(c echo.Context) error {
		return candidateScoutCtrl.Respond(c, c.Param("scoutId"))
	})
	candidateScoutGroup.POST("/:scoutId/reply", func(c echo.Context) error {
		return candidateScoutCtrl.Reply(c, c.Param("scoutId"))
	})
	candidateScoutGroup.POST("/bulk-decline", candidateScoutCtrl.BulkDecline)
	candidateScoutGroup.POST("/bulk-respond", candidateScoutCtrl.BulkRespond)

	// --- Scout Settings ---
	e.GET("/api/scout-settings", scoutSettingsCtrl.Get)
	e.PUT("/api/scout-settings", scoutSettingsCtrl.Update)
}
