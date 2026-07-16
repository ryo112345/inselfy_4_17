package initializer

import (
	sqlcgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc"
	httpcontroller "github.com/akiyama/inselfy/backend/internal/adapter/http/controller"
	openapigen "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

// wireJobs registers job posting routes (company management + public listing)
// and job application routes for both sides on the strict mux — this group is
// migrated to strict-server handlers (docs/strict-server-migration.md
// Phase 3-1 グループ8).
func wireJobs(sr *strictRouter, wrapper *openapigen.ServerInterfaceWrapper, ss *httpcontroller.StrictServer, d *deps) {
	ss.WireJobsGroup(
		httpcontroller.NewJobPostingController(usecase.NewJobPostingInteractor(d.jobPostingRepo), d.fileStorage),
		httpcontroller.NewJobApplicationController(
			usecase.NewJobApplicationInteractor(
				sqlcgw.NewJobApplicationRepository(d.pool),
				d.jobPostingRepo,
				sqlcgw.NewJobApplicationQueryService(d.pool),
			),
		),
	)

	// --- Company Jobs ---
	// アップロード3本は静的パスで、同位置に POST のワイルドカード兄弟が無いため
	// ServeMux 衝突なし（priority mux 不要）。
	sr.handle("POST /api/company/jobs/team-member-photo", wrapper.CompanyJobPostingsUploadTeamMemberPhoto)
	sr.handle("POST /api/company/jobs/gallery-image", wrapper.CompanyJobPostingsUploadGalleryImage)
	sr.handle("POST /api/company/jobs/cover-image", wrapper.CompanyJobPostingsUploadJobCoverImage)
	sr.handle("POST /api/company/jobs", wrapper.CompanyJobPostingsCreateJobPosting)
	sr.handle("GET /api/company/jobs", wrapper.CompanyJobPostingsListCompanyJobPostings)
	sr.handle("GET /api/company/jobs/{jobId}", wrapper.CompanyJobPostingsGetCompanyJobPosting)
	sr.handle("PUT /api/company/jobs/{jobId}", wrapper.CompanyJobPostingsUpdateJobPosting)
	sr.handle("DELETE /api/company/jobs/{jobId}", wrapper.CompanyJobPostingsDeleteJobPosting)

	// --- Job Postings (public) ---
	sr.handle("GET /api/jobs", wrapper.PublicJobPostingsListPublicJobPostings)
	sr.handle("GET /api/jobs/{jobId}", wrapper.PublicJobPostingsGetPublicJobPosting)

	// --- Candidate Job Applications ---
	sr.handle("POST /api/applications", wrapper.CandidateApplicationsApplyToJob)
	sr.handle("GET /api/applications", wrapper.CandidateApplicationsListCandidateApplications)
	sr.handle("GET /api/applications/check", wrapper.CandidateApplicationsCheckApplied)
	sr.handle("POST /api/applications/{applicationId}/withdraw", wrapper.CandidateApplicationsWithdrawApplication)

	// --- Company Job Applications ---
	sr.handle("GET /api/company/applications", wrapper.CompanyApplicationsListCompanyApplications)
	sr.handle("GET /api/company/applications/{applicationId}", wrapper.CompanyApplicationsGetApplication)
	sr.handle("PATCH /api/company/applications/{applicationId}/status", wrapper.CompanyApplicationsUpdateApplicationStatus)
}
