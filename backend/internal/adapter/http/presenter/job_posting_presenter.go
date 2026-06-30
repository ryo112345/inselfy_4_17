package presenter

import (
	"context"
	"time"

	"github.com/akiyama/inselfy/backend/internal/domain/jobposting"
	"github.com/akiyama/inselfy/backend/internal/port"
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

type JobPostingPresenter struct {
	single        *jobPostingResponse
	list          []*jobPostingResponse
	paginatedList *jobPostingListResponse
}

var _ port.JobPostingOutputPort = (*JobPostingPresenter)(nil)

// jobPostingConv is the goverter-generated entity→response mapper.
// See job_posting_converter.go for its declaration.
var jobPostingConv jobPostingConverter = &jobPostingConverterImpl{}

func NewJobPostingPresenter() *JobPostingPresenter {
	return &JobPostingPresenter{}
}

func (p *JobPostingPresenter) PresentJobPosting(_ context.Context, j *jobposting.JobPosting) error {
	p.single = jobPostingConv.ToResponse(j)
	return nil
}

func (p *JobPostingPresenter) PresentJobPostings(_ context.Context, js []*jobposting.JobPosting) error {
	p.list = jobPostingConv.ToResponses(js)
	return nil
}

func (p *JobPostingPresenter) SingleResponse() *jobPostingResponse        { return p.single }
func (p *JobPostingPresenter) ListResponse() []*jobPostingResponse        { return p.list }
func (p *JobPostingPresenter) PaginatedResponse() *jobPostingListResponse { return p.paginatedList }

func (p *JobPostingPresenter) PresentJobPostingsPaginated(_ context.Context, js []*jobposting.JobPosting, total int) error {
	p.paginatedList = &jobPostingListResponse{Items: jobPostingConv.ToResponses(js), Total: total}
	return nil
}
