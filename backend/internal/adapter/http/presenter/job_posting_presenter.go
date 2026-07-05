package presenter

import (
	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/domain/jobposting"
)

// jobPostingConv is the goverter-generated entity→response mapper.
// See job_posting_converter.go for its declaration.
var jobPostingConv jobPostingConverter = &jobPostingConverterImpl{}

// JobPostingResponse converts a single job posting entity to its API response.
func JobPostingResponse(j *jobposting.JobPosting) any { return jobPostingConv.ToResponse(j) }

// JobPostingsResponse converts a list of job posting entities to API responses.
func JobPostingsResponse(js []*jobposting.JobPosting) any { return jobPostingConv.ToResponses(js) }

// JobPostingsPaginatedResponse converts a paginated list of job postings to its API response.
func JobPostingsPaginatedResponse(js []*jobposting.JobPosting, total int) any {
	items := make([]openapi.ModelsJobPostingResponse, 0, len(js))
	for _, r := range jobPostingConv.ToResponses(js) {
		items = append(items, *r)
	}
	return &openapi.ModelsJobPostingListResponse{Items: items, Total: total}
}
