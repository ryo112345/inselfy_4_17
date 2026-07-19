package presenter

import (
	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/domain/jobapplication"
	"github.com/akiyama/inselfy/backend/internal/pkg/cast"
)

// jobApplicationConv is the goverter-generated read-model→response mapper.
// See job_application_converter.go for its declaration.
var jobApplicationConv jobApplicationConverter = &jobApplicationConverterImpl{}

// JobApplicationSingleResponse converts a single job application to its API response.
func JobApplicationSingleResponse(a *jobapplication.JobApplicationWithDetails) *openapi.ModelsJobApplicationResponse {
	return jobApplicationConv.ToResponse(a)
}

// JobApplicationsListResponse converts a paginated list of job applications to its API response.
func JobApplicationsListResponse(apps []*jobapplication.JobApplicationWithDetails, total int) *openapi.ModelsJobApplicationListResponse {
	items := make([]openapi.ModelsJobApplicationResponse, 0, len(apps))
	for _, r := range jobApplicationConv.ToResponses(apps) {
		items = append(items, *r)
	}
	return &openapi.ModelsJobApplicationListResponse{Items: items, Total: cast.Int32(total)}
}

// JobApplicationAppliedResponse builds the applied-check API response.
func JobApplicationAppliedResponse(applied bool) *openapi.ModelsAppliedResponse {
	return &openapi.ModelsAppliedResponse{Applied: applied}
}
