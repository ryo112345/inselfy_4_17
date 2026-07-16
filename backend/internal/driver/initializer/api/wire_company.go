package initializer

import (
	sqlcgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc"
	httpcontroller "github.com/akiyama/inselfy/backend/internal/adapter/http/controller"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

// wireCompany assembles the company-side controllers: profile (public +
// authenticated), teams (public scores + management), talent search, and
// saved candidates.
func wireCompany(ss *httpcontroller.StrictServer, d *deps) {
	companyProfileGw := sqlcgw.NewCompanyProfileGateway(d.pool)
	ss.WireCompanyGroup(
		httpcontroller.NewCompanyProfileController(
			usecase.NewCompanyProfileInteractor(companyProfileGw, companyProfileGw),
			d.fileStorage,
		),
		httpcontroller.NewCompanyTeamController(
			usecase.NewCompanyTeamInteractor(
				sqlcgw.NewCompanyTeamRepository(d.pool),
				sqlcgw.NewCompanyTeamQueryService(d.pool),
				d.tx,
			),
		),
		httpcontroller.NewTalentSearchController(
			usecase.NewTalentSearchInteractor(sqlcgw.NewTalentSearchQueryService(d.pool)),
		),
		httpcontroller.NewSavedCandidateController(
			usecase.NewSavedCandidateInteractor(sqlcgw.NewSavedCandidateRepository(d.pool), sqlcgw.NewSavedCandidateQueryService(d.pool)),
		),
	)
}
