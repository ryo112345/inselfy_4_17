package initializer

import (
	sqlcgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc"
	httpcontroller "github.com/akiyama/inselfy/backend/internal/adapter/http/controller"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

// wireInterview assembles the interview scheduling controller and returns it
// so BuildServer can attach the WebSocket hub afterwards. WS（/api/ws）は
// スペック外のまま（initializer.go で登録）。
func wireInterview(ss *httpcontroller.StrictServer, d *deps) *httpcontroller.InterviewController {
	interviewCtrl := httpcontroller.NewInterviewController(usecase.NewInterviewInteractor(
		sqlcgw.NewInterviewProposalRepository(d.pool),
		sqlcgw.NewInterviewSlotRepository(d.pool),
		sqlcgw.NewInterviewRepository(d.pool),
		d.convRepo, d.msgRepo, d.participantRepo,
		sqlcgw.NewInterviewQueryService(d.pool),
		d.tx,
	))
	ss.WireInterviewGroup(interviewCtrl)
	return interviewCtrl
}
