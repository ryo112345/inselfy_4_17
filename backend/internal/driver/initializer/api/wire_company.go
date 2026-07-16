package initializer

import (
	sqlcgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc"
	httpcontroller "github.com/akiyama/inselfy/backend/internal/adapter/http/controller"
	openapigen "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

// wireCompany registers company-side routes on the strict mux: profile
// (public + authenticated), teams (public scores + management), talent search,
// and saved candidates — this group is migrated to strict-server handlers
// (docs/strict-server-migration.md Phase 3-1 グループ6).
func wireCompany(sr *strictRouter, wrapper *openapigen.ServerInterfaceWrapper, ss *httpcontroller.StrictServer, d *deps) {
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

	// --- Company Profile (public) ---
	sr.handle("GET /api/companies/{id}", wrapper.PublicCompanyProfilesGetPublicCompanyProfile)
	sr.handle("GET /api/companies/{id}/teams/scores", wrapper.PublicTeamScoresGetPublicTeamScores)

	// --- Company Profile (authenticated) ---
	sr.handle("GET /api/company/profile", wrapper.CompanyProfilesGetCompanyProfile)
	sr.handle("PUT /api/company/profile", wrapper.CompanyProfilesUpdateCompanyProfile)
	sr.handle("POST /api/company/profile/image", wrapper.CompanyProfilesUploadCompanyProfileImage)
	sr.handle("DELETE /api/company/profile/image", wrapper.CompanyProfilesDeleteCompanyProfileImage)

	// --- Company Teams ---
	sr.handle("GET /api/company/teams", wrapper.CompanyTeamsListTeams)
	sr.handle("POST /api/company/teams", wrapper.CompanyTeamsCreateTeam)
	sr.handle("GET /api/company/teams/{teamId}", wrapper.CompanyTeamsGetTeam)
	sr.handle("PUT /api/company/teams/{teamId}", wrapper.CompanyTeamsUpdateTeam)
	sr.handle("DELETE /api/company/teams/{teamId}", wrapper.CompanyTeamsDeleteTeam)
	sr.handle("POST /api/company/teams/{teamId}/members", wrapper.CompanyTeamsAddTeamMember)
	sr.handle("DELETE /api/company/teams/{teamId}/members/{memberId}", wrapper.CompanyTeamsRemoveTeamMember)
	sr.handle("GET /api/company/teams/{teamId}/scores", wrapper.CompanyTeamsGetTeamScores)
	sr.handle("PUT /api/company/teams/{teamId}/ace/{memberId}", wrapper.CompanyTeamsSetAceMember)
	sr.handle("DELETE /api/company/teams/{teamId}/ace", wrapper.CompanyTeamsUnsetAceMember)

	// --- Talent Search ---
	sr.handle("GET /api/company/talents/search", wrapper.TalentSearchSearchTalents)
	sr.handle("GET /api/company/talents/search/diagnostic", wrapper.TalentSearchDiagnosticSearchTalents)
	sr.handle("GET /api/company/talents/search/diagnostic/ci", wrapper.TalentSearchCiDiagnosticSearchTalents)
	sr.handle("GET /api/company/talents/search/diagnostic/integrated", wrapper.TalentSearchIntegratedDiagnosticSearchTalents)

	// --- Saved Candidates ---
	// count / bulk-check は {userId} の strict subset なので ServeMux の
	// 静的優先で解決できる（priority mux 不要）。
	sr.handle("GET /api/company/saved-candidates", wrapper.SavedCandidatesListSavedCandidates)
	sr.handle("GET /api/company/saved-candidates/count", wrapper.SavedCandidatesCountSavedCandidates)
	sr.handle("POST /api/company/saved-candidates/bulk-check", wrapper.SavedCandidatesBulkCheckSaved)
	sr.handle("POST /api/company/saved-candidates/{userId}", wrapper.SavedCandidatesSaveCandidate)
	sr.handle("DELETE /api/company/saved-candidates/{userId}", wrapper.SavedCandidatesUnsaveCandidate)
	sr.handle("GET /api/company/saved-candidates/{userId}", wrapper.SavedCandidatesIsCandidateSaved)
}
