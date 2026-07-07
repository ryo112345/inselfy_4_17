package initializer

import (
	"github.com/labstack/echo/v4"

	sqlcgw "github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc"
	httpcontroller "github.com/akiyama/inselfy/backend/internal/adapter/http/controller"
	"github.com/akiyama/inselfy/backend/internal/usecase"
)

// wireJobs registers job posting routes (company management + public listing)
// and job application routes for both sides.
func wireJobs(e *echo.Echo, d *deps, jwtMW, companyJwtMW echo.MiddlewareFunc) {
	jobPostingCtrl := httpcontroller.NewJobPostingController(usecase.NewJobPostingInteractor(d.jobPostingRepo))
	jobApplicationCtrl := httpcontroller.NewJobApplicationController(
		usecase.NewJobApplicationInteractor(
			sqlcgw.NewJobApplicationRepository(d.pool),
			d.jobPostingRepo,
			sqlcgw.NewJobApplicationQueryService(d.pool),
		),
	)

	// --- Company Jobs ---
	jobGroup := e.Group("/api/company/jobs", companyJwtMW)
	jobGroup.POST("/team-member-photo", httpcontroller.HandleImageUpload(d.fileStorage, "team-member-photos"))
	jobGroup.POST("/gallery-image", httpcontroller.HandleImageUpload(d.fileStorage, "gallery-images"))
	jobGroup.POST("/cover-image", httpcontroller.HandleImageUpload(d.fileStorage, "cover-images"))
	jobGroup.POST("", jobPostingCtrl.Create)
	jobGroup.GET("", jobPostingCtrl.List)
	jobGroup.GET("/:jobId", func(c echo.Context) error {
		return jobPostingCtrl.Get(c, c.Param("jobId"))
	})
	jobGroup.PUT("/:jobId", func(c echo.Context) error {
		return jobPostingCtrl.Update(c, c.Param("jobId"))
	})
	jobGroup.DELETE("/:jobId", func(c echo.Context) error {
		return jobPostingCtrl.Delete(c, c.Param("jobId"))
	})

	// --- Job Postings (public) ---
	e.GET("/api/jobs", jobPostingCtrl.ListPublic)
	e.GET("/api/jobs/:jobId", func(c echo.Context) error {
		return jobPostingCtrl.GetPublic(c, c.Param("jobId"))
	})

	// --- Candidate Job Applications ---
	candidateAppGroup := e.Group("/api/applications", jwtMW)
	candidateAppGroup.POST("", jobApplicationCtrl.Apply)
	candidateAppGroup.GET("", jobApplicationCtrl.ListByCandidate)
	candidateAppGroup.GET("/check", jobApplicationCtrl.CheckApplied)
	candidateAppGroup.POST("/:applicationId/withdraw", func(c echo.Context) error {
		return jobApplicationCtrl.Withdraw(c, c.Param("applicationId"))
	})

	// --- Company Job Applications ---
	companyAppGroup := e.Group("/api/company/applications", companyJwtMW)
	companyAppGroup.GET("", jobApplicationCtrl.ListByCompany)
	companyAppGroup.GET("/:applicationId", func(c echo.Context) error {
		return jobApplicationCtrl.GetByID(c, c.Param("applicationId"))
	})
	companyAppGroup.PATCH("/:applicationId/status", func(c echo.Context) error {
		return jobApplicationCtrl.UpdateStatus(c, c.Param("applicationId"))
	})
}
