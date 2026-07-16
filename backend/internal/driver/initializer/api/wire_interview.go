package initializer

import (
	sqlcgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc"
	httpcontroller "github.com/akiyama/inselfy/backend/internal/adapter/http/controller"
	openapigen "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

// wireInterview registers interview scheduling routes on the strict mux and
// returns the controller so BuildServer can attach the WebSocket hub
// afterwards — this group is migrated to strict-server handlers
// (docs/strict-server-migration.md Phase 3-1 グループ10)。WS（/api/ws）は
// スペック外のまま。
func wireInterview(sr *strictRouter, wrapper *openapigen.ServerInterfaceWrapper, ss *httpcontroller.StrictServer, d *deps) *httpcontroller.InterviewController {
	interviewCtrl := httpcontroller.NewInterviewController(usecase.NewInterviewInteractor(
		sqlcgw.NewInterviewProposalRepository(d.pool),
		sqlcgw.NewInterviewSlotRepository(d.pool),
		sqlcgw.NewInterviewRepository(d.pool),
		d.convRepo, d.msgRepo, d.participantRepo,
		sqlcgw.NewInterviewQueryService(d.pool),
		d.tx,
	))
	ss.WireInterviewGroup(interviewCtrl)

	// --- Company Interviews ---
	// propose（1セグメント）と {interviewId}/cancel（2セグメント）はセグメント数が
	// 異なり曖昧にならない（pending/{applicationId} も同様）。
	sr.handle("POST /api/company/interviews/propose", wrapper.CompanyInterviewsProposeInterview)
	sr.handle("GET /api/company/interviews/pending/{applicationId}", wrapper.CompanyInterviewsGetPendingProposal)
	sr.handle("GET /api/company/interviews", wrapper.CompanyInterviewsListCompanyInterviews)
	sr.handle("POST /api/company/interviews/{interviewId}/cancel", wrapper.CompanyInterviewsCancelCompanyInterview)

	// --- Candidate Interviews ---
	sr.handle("GET /api/interviews", wrapper.CandidateInterviewsListCandidateInterviews)
	sr.handle("POST /api/interviews/proposals/{proposalId}/select", wrapper.CandidateInterviewsSelectInterviewSlot)
	sr.handle("GET /api/interviews/proposals/{proposalId}/slots", wrapper.CandidateInterviewsGetProposalSlots)
	sr.handle("POST /api/interviews/{interviewId}/cancel", wrapper.CandidateInterviewsCancelCandidateInterview)

	return interviewCtrl
}
