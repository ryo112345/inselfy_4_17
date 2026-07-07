package initializer

import (
	"github.com/labstack/echo/v4"

	sqlcgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc"
	httpcontroller "github.com/akiyama/inselfy/backend/internal/adapter/http/controller"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

// wireDiagnosis registers the Work Values / Career Interest diagnosis routes
// and the invite-token based team diagnose routes that reuse the same
// interactors.
func wireDiagnosis(e *echo.Echo, d *deps, jwtMW, anyJwtMW echo.MiddlewareFunc) {
	wvInput := usecase.NewWorkValuesInteractor(
		sqlcgw.NewWorkValuesSessionRepository(d.pool),
		sqlcgw.NewWorkValuesResultRepository(d.pool),
		sqlcgw.NewWorkValuesScoreRepository(d.pool),
	)
	wvCtrl := httpcontroller.NewWorkValuesController(wvInput)
	ciInput := usecase.NewCareerInterestInteractor(
		sqlcgw.NewCareerInterestSessionRepository(d.pool),
		sqlcgw.NewCareerInterestResultRepository(d.pool),
		sqlcgw.NewCareerInterestBasicScoreRepository(d.pool),
		sqlcgw.NewCareerInterestTypeScoreRepository(d.pool),
	)
	ciCtrl := httpcontroller.NewCareerInterestController(ciInput)

	// --- Work Values ---
	// 書き込みは本人（候補者JWT）のみ、読み取りはログイン済みの候補者/企業どちらでも可
	wvGroup := e.Group("/api/work-values")
	wvGroup.POST("/sessions", wvCtrl.StartSession, jwtMW)
	wvGroup.POST("/sessions/:sessionId/results", func(c echo.Context) error {
		return wvCtrl.SubmitResult(c, c.Param("sessionId"))
	}, jwtMW)
	wvGroup.GET("/users/:userId/results/latest", func(c echo.Context) error {
		return wvCtrl.GetLatestResult(c, c.Param("userId"))
	}, anyJwtMW)
	wvGroup.GET("/sessions/:sessionId/results", func(c echo.Context) error {
		return wvCtrl.GetResultBySessionID(c, c.Param("sessionId"))
	}, anyJwtMW)

	// --- Career Interest ---
	ciGroup := e.Group("/api/career-interest")
	ciGroup.POST("/sessions", ciCtrl.StartSession, jwtMW)
	ciGroup.POST("/sessions/:sessionId/results", func(c echo.Context) error {
		return ciCtrl.SubmitResult(c, c.Param("sessionId"))
	}, jwtMW)
	ciGroup.GET("/users/:userId/results/latest", func(c echo.Context) error {
		return ciCtrl.GetLatestResult(c, c.Param("userId"))
	}, anyJwtMW)
	ciGroup.GET("/sessions/:sessionId/results", func(c echo.Context) error {
		return ciCtrl.GetResultBySessionID(c, c.Param("sessionId"))
	}, anyJwtMW)

	// --- Team Diagnose (invite-token authorized) ---
	diagCtrl := httpcontroller.NewTeamDiagnoseController(
		usecase.NewTeamDiagnoseInteractor(sqlcgw.NewTeamDiagnoseQueryService(d.pool), sqlcgw.NewTeamMemberRepository(d.pool)),
		wvInput,
		ciInput,
	)
	e.GET("/api/team-diagnose/:token", func(c echo.Context) error {
		return diagCtrl.GetByToken(c, c.Param("token"))
	})
	e.PUT("/api/team-diagnose/:token/status", func(c echo.Context) error {
		return diagCtrl.UpdateStatus(c, c.Param("token"))
	})
	// 招待メンバーは未ログインで診断を受けるため、招待トークンを認可として診断セッションを操作する
	e.POST("/api/team-diagnose/:token/work-values/sessions", func(c echo.Context) error {
		return diagCtrl.StartWVSession(c, c.Param("token"))
	})
	e.POST("/api/team-diagnose/:token/work-values/sessions/:sessionId/results", func(c echo.Context) error {
		return diagCtrl.SubmitWVResult(c, c.Param("token"), c.Param("sessionId"))
	})
	e.POST("/api/team-diagnose/:token/career-interest/sessions", func(c echo.Context) error {
		return diagCtrl.StartCISession(c, c.Param("token"))
	})
	e.POST("/api/team-diagnose/:token/career-interest/sessions/:sessionId/results", func(c echo.Context) error {
		return diagCtrl.SubmitCIResult(c, c.Param("token"), c.Param("sessionId"))
	})
}
