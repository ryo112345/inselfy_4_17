package presenter

import (
	"time"

	"github.com/akiyama/inselfy/backend/internal/domain/jobapplication"
)

type JobApplicationResponse struct {
	ID                     string    `json:"id"`
	JobPostingID           string    `json:"jobPostingId"`
	CandidateID            string    `json:"candidateId"`
	CompanyID              string    `json:"companyId"`
	Status                 string    `json:"status"`
	Message                string    `json:"message"`
	JobTitle               string    `json:"jobTitle"`
	CompanyName            string    `json:"companyName"`
	CandidateName          string    `json:"candidateName"`
	CandidateAvatar        string    `json:"candidateAvatar"`
	CandidateUsername      string    `json:"candidateUsername"`
	CandidateHeadline      string    `json:"candidateHeadline"`
	CandidateProfileColor  string    `json:"candidateProfileColor,omitempty"`
	CandidateSeekingStatus string    `json:"candidateSeekingStatus,omitempty"`
	CandidateSkills        []string  `json:"candidateSkills,omitempty"`
	WVSimilarity           *float64  `json:"wvSimilarity,omitempty"`
	CISimilarity           *float64  `json:"ciSimilarity,omitempty"`
	IntSimilarity          *float64  `json:"integratedSimilarity,omitempty"`
	CreatedAt              time.Time `json:"createdAt"`
	UpdatedAt              time.Time `json:"updatedAt"`
}

type JobApplicationListResponse struct {
	Items []*JobApplicationResponse `json:"items"`
	Total int                       `json:"total"`
}

type appliedResponse struct {
	Applied bool `json:"applied"`
}

// jobApplicationConv is the goverter-generated read-model→response mapper.
// See job_application_converter.go for its declaration.
var jobApplicationConv jobApplicationConverter = &jobApplicationConverterImpl{}

// JobApplicationSingleResponse converts a single job application to its API response.
func JobApplicationSingleResponse(a *jobapplication.JobApplicationWithDetails) any {
	return jobApplicationConv.ToResponse(a)
}

// JobApplicationsListResponse converts a paginated list of job applications to its API response.
func JobApplicationsListResponse(apps []*jobapplication.JobApplicationWithDetails, total int) any {
	return &JobApplicationListResponse{Items: jobApplicationConv.ToResponses(apps), Total: total}
}

// JobApplicationAppliedResponse builds the applied-check API response.
func JobApplicationAppliedResponse(applied bool) any {
	return &appliedResponse{Applied: applied}
}
