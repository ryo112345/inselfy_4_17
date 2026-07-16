package initializer

import (
	sqlcgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc"
	httpcontroller "github.com/akiyama/inselfy/backend/internal/adapter/http/controller"
	openapigen "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

// wireDiagnosis registers the Work Values / Career Interest diagnosis routes
// and the invite-token based team diagnose routes on the strict mux — this
// group is migrated to strict-server handlers
// (docs/strict-server-migration.md Phase 3-1 グループ4).
// 読み取り系の OR security（CandidateAuth or CompanyAuth）は上流の OpenAPI
// validator が検証する。チーム診断はスペック上 security なし
// （パスの招待トークンが認可）。
func wireDiagnosis(sr *strictRouter, wrapper *openapigen.ServerInterfaceWrapper, ss *httpcontroller.StrictServer, d *deps) {
	wvInput := usecase.NewWorkValuesInteractor(
		sqlcgw.NewWorkValuesSessionRepository(d.pool),
		sqlcgw.NewWorkValuesResultRepository(d.pool),
		sqlcgw.NewWorkValuesScoreRepository(d.pool),
		sqlcgw.NewWorkValuesReportQueryService(d.pool),
	)
	ciInput := usecase.NewCareerInterestInteractor(
		sqlcgw.NewCareerInterestSessionRepository(d.pool),
		sqlcgw.NewCareerInterestResultRepository(d.pool),
		sqlcgw.NewCareerInterestBasicScoreRepository(d.pool),
		sqlcgw.NewCareerInterestTypeScoreRepository(d.pool),
		sqlcgw.NewCareerInterestReportQueryService(d.pool),
	)
	ss.WireDiagnosisGroup(
		httpcontroller.NewWorkValuesController(wvInput),
		httpcontroller.NewCareerInterestController(ciInput),
		httpcontroller.NewTeamDiagnoseController(
			usecase.NewTeamDiagnoseInteractor(sqlcgw.NewTeamDiagnoseQueryService(d.pool), sqlcgw.NewTeamMemberRepository(d.pool)),
			wvInput,
			ciInput,
		),
	)

	// --- Work Values ---
	// 書き込みは本人（候補者JWT）のみ、読み取りはログイン済みの候補者/企業どちらでも可
	sr.handle("POST /api/work-values/sessions", wrapper.WorkValuesWvStartSession)
	sr.handle("POST /api/work-values/sessions/{sessionId}/results", wrapper.WorkValuesWvSubmitResult)
	sr.handle("GET /api/work-values/sessions/{sessionId}/results", wrapper.WorkValuesWvGetResultBySession)
	sr.handle("GET /api/work-values/users/{userId}/results/latest", wrapper.WorkValuesWvGetLatestResult)
	sr.handle("POST /api/work-values/sessions/{sessionId}/ai-report/request", wrapper.WorkValuesWvRequestAiReport)

	// --- Career Interest ---
	sr.handle("POST /api/career-interest/sessions", wrapper.CareerInterestCiStartSession)
	sr.handle("POST /api/career-interest/sessions/{sessionId}/results", wrapper.CareerInterestCiSubmitResult)
	sr.handle("GET /api/career-interest/sessions/{sessionId}/results", wrapper.CareerInterestCiGetResultBySession)
	sr.handle("GET /api/career-interest/users/{userId}/results/latest", wrapper.CareerInterestCiGetLatestResult)
	sr.handle("POST /api/career-interest/sessions/{sessionId}/ai-report/request", wrapper.CareerInterestCiRequestAiReport)

	// --- Team Diagnose (invite-token authorized) ---
	// 招待メンバーは未ログインで診断を受けるため、招待トークンを認可として診断セッションを操作する
	sr.handle("GET /api/team-diagnose/{token}", wrapper.TeamDiagnoseGetDiagnoseByToken)
	sr.handle("PUT /api/team-diagnose/{token}/status", wrapper.TeamDiagnoseUpdateDiagnoseStatus)
	sr.handle("POST /api/team-diagnose/{token}/work-values/sessions", wrapper.TeamDiagnoseStartDiagnoseWvSession)
	sr.handle("POST /api/team-diagnose/{token}/work-values/sessions/{sessionId}/results", wrapper.TeamDiagnoseSubmitDiagnoseWvResult)
	sr.handle("POST /api/team-diagnose/{token}/career-interest/sessions", wrapper.TeamDiagnoseStartDiagnoseCiSession)
	sr.handle("POST /api/team-diagnose/{token}/career-interest/sessions/{sessionId}/results", wrapper.TeamDiagnoseSubmitDiagnoseCiResult)
}
