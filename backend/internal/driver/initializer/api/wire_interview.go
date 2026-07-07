package initializer

import (
	"github.com/labstack/echo/v4"

	sqlcgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc"
	httpcontroller "github.com/akiyama/inselfy/backend/internal/adapter/http/controller"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

// wireInterview registers interview scheduling routes and returns the
// controller so BuildServer can attach the WebSocket hub afterwards.
func wireInterview(e *echo.Echo, d *deps, jwtMW, companyJwtMW echo.MiddlewareFunc) *httpcontroller.InterviewController {
	interviewCtrl := httpcontroller.NewInterviewController(usecase.NewInterviewInteractor(
		sqlcgw.NewInterviewProposalRepository(d.pool),
		sqlcgw.NewInterviewSlotRepository(d.pool),
		sqlcgw.NewInterviewRepository(d.pool),
		d.convRepo, d.msgRepo, d.participantRepo,
		sqlcgw.NewInterviewQueryService(d.pool),
		d.tx,
	))

	// --- Company Interviews ---
	companyInterviewGroup := e.Group("/api/company/interviews", companyJwtMW)
	companyInterviewGroup.POST("/propose", interviewCtrl.Propose)
	companyInterviewGroup.GET("/pending/:applicationId", interviewCtrl.GetPendingProposal)
	companyInterviewGroup.GET("", interviewCtrl.ListByCompany)
	companyInterviewGroup.POST("/:interviewId/cancel", func(c echo.Context) error {
		return interviewCtrl.CancelInterview(c)
	})

	// --- Candidate Interviews ---
	candidateInterviewGroup := e.Group("/api/interviews", jwtMW)
	candidateInterviewGroup.GET("", interviewCtrl.ListByCandidate)
	candidateInterviewGroup.POST("/proposals/:proposalId/select", func(c echo.Context) error {
		return interviewCtrl.SelectSlot(c)
	})
	candidateInterviewGroup.GET("/proposals/:proposalId/slots", func(c echo.Context) error {
		return interviewCtrl.GetProposalSlots(c)
	})
	candidateInterviewGroup.POST("/:interviewId/cancel", func(c echo.Context) error {
		return interviewCtrl.CancelInterview(c)
	})

	return interviewCtrl
}
