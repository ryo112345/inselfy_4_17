package initializer

import (
	sqlcgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc"
	httpcontroller "github.com/akiyama/inselfy/backend/internal/adapter/http/controller"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

// wireJobs assembles the job posting controllers (company management +
// public listing) and the job application controllers for both sides.
func wireJobs(ss *httpcontroller.StrictServer, d *deps) {
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
}
