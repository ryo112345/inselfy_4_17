package presenter

import (
	"time"

	"github.com/akiyama/inselfy/backend/internal/domain/jobposting"
)

type jobPostingResponse struct {
	ID                        string                  `json:"id"`
	CompanyID                 string                  `json:"companyId"`
	CompanyName               string                  `json:"companyName,omitempty"`
	CompanyLogoURL            string                  `json:"companyLogoUrl,omitempty"`
	Title                     string                  `json:"title"`
	Description               string                  `json:"description"`
	EmploymentType            string                  `json:"employmentType"`
	Location                  *string                 `json:"location"`
	IsActive                  bool                    `json:"isActive"`
	Status                    string                  `json:"status"`
	JobCategory               string                  `json:"jobCategory"`
	HiringCount               string                  `json:"hiringCount"`
	AppealPoints              string                  `json:"appealPoints"`
	Challenges                string                  `json:"challenges"`
	TeamDescription           string                  `json:"teamDescription"`
	TeamMembers               []jobposting.TeamMember `json:"teamMembers"`
	TeamLabel                 string                  `json:"teamLabel"`
	TeamID                    *string                 `json:"teamId"`
	SkillsGained              string                  `json:"skillsGained"`
	Tags                      []string                `json:"tags"`
	RequiredQualifications    string                  `json:"requiredQualifications"`
	PreferredQualifications   string                  `json:"preferredQualifications"`
	WorkLocation              string                  `json:"workLocation"`
	WorkLocationChangeScope   string                  `json:"workLocationChangeScope"`
	JobDescriptionChangeScope string                  `json:"jobDescriptionChangeScope"`
	ContractType              string                  `json:"contractType"`
	ProbationPeriod           string                  `json:"probationPeriod"`
	WorkHours                 string                  `json:"workHours"`
	BreakTime                 string                  `json:"breakTime"`
	Holidays                  string                  `json:"holidays"`
	SalaryMin                 *int32                  `json:"salaryMin"`
	SalaryMax                 *int32                  `json:"salaryMax"`
	SalaryDetail              string                  `json:"salaryDetail"`
	Insurance                 string                  `json:"insurance"`
	RemotePolicy              string                  `json:"remotePolicy"`
	Benefits                  string                  `json:"benefits"`
	SmokingPolicy             string                  `json:"smokingPolicy"`
	SelectionProcess          string                  `json:"selectionProcess"`
	CoverImageURL             string                  `json:"coverImageUrl"`
	HighlightTitleRole        string                  `json:"highlightTitleRole"`
	HighlightTitleAppeal      string                  `json:"highlightTitleAppeal"`
	HighlightTitleChallenge   string                  `json:"highlightTitleChallenge"`
	HighlightTitleGrowth      string                  `json:"highlightTitleGrowth"`
	GalleryURLs               []string                `json:"galleryUrls"`
	CreatedAt                 time.Time               `json:"createdAt"`
	UpdatedAt                 time.Time               `json:"updatedAt"`
}

type jobPostingListResponse struct {
	Items []*jobPostingResponse `json:"items"`
	Total int                   `json:"total"`
}

// jobPostingConv is the goverter-generated entity→response mapper.
// See job_posting_converter.go for its declaration.
var jobPostingConv jobPostingConverter = &jobPostingConverterImpl{}

// JobPostingResponse converts a single job posting entity to its API response.
func JobPostingResponse(j *jobposting.JobPosting) any { return jobPostingConv.ToResponse(j) }

// JobPostingsResponse converts a list of job posting entities to API responses.
func JobPostingsResponse(js []*jobposting.JobPosting) any { return jobPostingConv.ToResponses(js) }

// JobPostingsPaginatedResponse converts a paginated list of job postings to its API response.
func JobPostingsPaginatedResponse(js []*jobposting.JobPosting, total int) any {
	return &jobPostingListResponse{Items: jobPostingConv.ToResponses(js), Total: total}
}
