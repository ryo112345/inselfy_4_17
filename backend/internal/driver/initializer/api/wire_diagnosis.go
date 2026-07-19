package initializer

import (
	sqlcgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc"
	httpcontroller "github.com/akiyama/inselfy/backend/internal/adapter/http/controller"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

// wireDiagnosis assembles the Work Values / Career Interest diagnosis
// controllers and the invite-token based team diagnose controller.
// 書き込みは本人（候補者JWT）のみ、読み取り系の OR security（CandidateAuth or
// CompanyAuth）は上流の OpenAPI validator が検証する。チーム診断はスペック上
// security なし（パスの招待トークンが認可）。
func wireDiagnosis(ss *httpcontroller.StrictServer, d *deps) {
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
}
