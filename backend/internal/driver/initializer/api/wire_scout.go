package initializer

import (
	sqlcgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc"
	httpcontroller "github.com/akiyama/inselfy/backend/internal/adapter/http/controller"
	openapigen "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

// wireScout registers scout routes on the strict mux for both sides: company
// sending/templates and candidate inbox/settings — this group is migrated to
// strict-server handlers (docs/strict-server-migration.md Phase 3-1 グループ7).
func wireScout(sr *strictRouter, wrapper *openapigen.ServerInterfaceWrapper, ss *httpcontroller.StrictServer, d *deps) {
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
	ss.WireScoutGroup(
		httpcontroller.NewScoutController(scoutItr),
		httpcontroller.NewCandidateScoutController(scoutItr, d.scoutMsgRepo, d.convRepo),
		httpcontroller.NewScoutSettingsController(scoutItr),
		httpcontroller.NewScoutTemplateController(
			usecase.NewScoutTemplateInteractor(sqlcgw.NewScoutTemplateRepository(d.pool)),
		),
	)

	// --- Company Scouts ---
	// credits / quality / dashboard は {scoutId} の strict subset なので
	// ServeMux の静的優先で解決できる（priority mux 不要）。
	sr.handle("POST /api/company/scouts", wrapper.CompanyScoutsSendScout)
	sr.handle("GET /api/company/scouts", wrapper.CompanyScoutsListCompanyScouts)
	sr.handle("GET /api/company/scouts/credits", wrapper.CompanyScoutsGetScoutCredits)
	sr.handle("GET /api/company/scouts/quality", wrapper.CompanyScoutsGetScoutQuality)
	sr.handle("GET /api/company/scouts/dashboard", wrapper.CompanyScoutsGetScoutDashboard)
	sr.handle("GET /api/company/scouts/{scoutId}", wrapper.CompanyScoutsGetCompanyScoutDetail)
	sr.handle("POST /api/company/scouts/{scoutId}/reply", wrapper.CompanyScoutsCompanyScoutReply)

	// --- Company Scout Templates ---
	sr.handle("POST /api/company/scout-templates", wrapper.ScoutTemplatesCreateScoutTemplate)
	sr.handle("GET /api/company/scout-templates", wrapper.ScoutTemplatesListScoutTemplates)
	sr.handle("GET /api/company/scout-templates/{templateId}", wrapper.ScoutTemplatesGetScoutTemplate)
	sr.handle("PUT /api/company/scout-templates/{templateId}", wrapper.ScoutTemplatesUpdateScoutTemplate)
	sr.handle("DELETE /api/company/scout-templates/{templateId}", wrapper.ScoutTemplatesDeleteScoutTemplate)

	// --- Candidate Scouts ---
	// bulk-decline / bulk-respond は {scoutId}/... とセグメント数が異なり衝突しない。
	sr.handle("GET /api/scouts", wrapper.CandidateScoutsListCandidateScouts)
	sr.handle("GET /api/scouts/unread-count", wrapper.CandidateScoutsCountCandidateUnreadScouts)
	sr.handle("GET /api/scouts/{scoutId}", wrapper.CandidateScoutsGetCandidateScoutDetail)
	sr.handle("POST /api/scouts/{scoutId}/respond", wrapper.CandidateScoutsRespondToScout)
	sr.handle("POST /api/scouts/{scoutId}/reply", wrapper.CandidateScoutsCandidateScoutReply)
	sr.handle("POST /api/scouts/bulk-decline", wrapper.CandidateScoutsBulkDeclineScouts)
	sr.handle("POST /api/scouts/bulk-respond", wrapper.CandidateScoutsBulkRespondScouts)

	// --- Scout Settings ---
	sr.handle("GET /api/scout-settings", wrapper.ScoutSettingsGetScoutSettings)
	sr.handle("PUT /api/scout-settings", wrapper.ScoutSettingsUpdateScoutSettings)
}
