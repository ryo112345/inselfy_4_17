package presenter

import (
	"context"
	"time"

	"github.com/akiyama/inselfy/backend/internal/domain/jobposting"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type jobPostingResponse struct {
	ID                        string    `json:"id"`
	CompanyID                 string    `json:"companyId"`
	CompanyName               string    `json:"companyName,omitempty"`
	CompanyLogoURL            string    `json:"companyLogoUrl,omitempty"`
	Title                     string    `json:"title"`
	Description               string    `json:"description"`
	EmploymentType            string    `json:"employmentType"`
	Location                  *string   `json:"location"`
	IsActive                  bool      `json:"isActive"`
	Status                    string    `json:"status"`
	JobCategory               string    `json:"jobCategory"`
	HiringCount               string    `json:"hiringCount"`
	AppealPoints              string    `json:"appealPoints"`
	Challenges                string    `json:"challenges"`
	TeamDescription           string                    `json:"teamDescription"`
	TeamMembers               []jobposting.TeamMember   `json:"teamMembers"`
	TeamLabel                 string                    `json:"teamLabel"`
	TeamID                    *string                   `json:"teamId"`
	SkillsGained              string                    `json:"skillsGained"`
	Tags                      []string  `json:"tags"`
	RequiredQualifications    string    `json:"requiredQualifications"`
	PreferredQualifications   string    `json:"preferredQualifications"`
	WorkLocation              string    `json:"workLocation"`
	WorkLocationChangeScope   string    `json:"workLocationChangeScope"`
	JobDescriptionChangeScope string    `json:"jobDescriptionChangeScope"`
	ContractType              string    `json:"contractType"`
	ProbationPeriod           string    `json:"probationPeriod"`
	WorkHours                 string    `json:"workHours"`
	BreakTime                 string    `json:"breakTime"`
	Holidays                  string    `json:"holidays"`
	SalaryMin                 *int32    `json:"salaryMin"`
	SalaryMax                 *int32    `json:"salaryMax"`
	SalaryDetail              string    `json:"salaryDetail"`
	Insurance                 string    `json:"insurance"`
	RemotePolicy              string    `json:"remotePolicy"`
	Benefits                  string    `json:"benefits"`
	SmokingPolicy             string    `json:"smokingPolicy"`
	SelectionProcess          string    `json:"selectionProcess"`
	CoverImageURL             string    `json:"coverImageUrl"`
	HighlightTitleRole        string    `json:"highlightTitleRole"`
	HighlightTitleAppeal      string    `json:"highlightTitleAppeal"`
	HighlightTitleChallenge   string    `json:"highlightTitleChallenge"`
	HighlightTitleGrowth      string    `json:"highlightTitleGrowth"`
	GalleryURLs               []string  `json:"galleryUrls"`
	CreatedAt                 time.Time `json:"createdAt"`
	UpdatedAt                 time.Time `json:"updatedAt"`
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

func NewJobPostingPresenter() *JobPostingPresenter {
	return &JobPostingPresenter{}
}

func (p *JobPostingPresenter) PresentJobPosting(_ context.Context, j *jobposting.JobPosting) error {
	p.single = toJobPostingResponse(j)
	return nil
}

func (p *JobPostingPresenter) PresentJobPostings(_ context.Context, js []*jobposting.JobPosting) error {
	items := make([]*jobPostingResponse, len(js))
	for i, j := range js {
		items[i] = toJobPostingResponse(j)
	}
	p.list = items
	return nil
}

func (p *JobPostingPresenter) SingleResponse() *jobPostingResponse   { return p.single }
func (p *JobPostingPresenter) ListResponse() []*jobPostingResponse   { return p.list }
func (p *JobPostingPresenter) PaginatedResponse() *jobPostingListResponse { return p.paginatedList }

func (p *JobPostingPresenter) PresentJobPostingsPaginated(_ context.Context, js []*jobposting.JobPosting, total int) error {
	items := make([]*jobPostingResponse, len(js))
	for i, j := range js {
		items[i] = toJobPostingResponse(j)
	}
	p.paginatedList = &jobPostingListResponse{Items: items, Total: total}
	return nil
}

func toJobPostingResponse(j *jobposting.JobPosting) *jobPostingResponse {
	tags := j.Tags
	if tags == nil {
		tags = []string{}
	}
	galleryURLs := j.GalleryURLs
	if galleryURLs == nil {
		galleryURLs = []string{}
	}
	return &jobPostingResponse{
		ID:                        j.ID,
		CompanyID:                 j.CompanyID,
		CompanyName:               j.CompanyName,
		CompanyLogoURL:            j.CompanyLogoURL,
		Title:                     j.Title,
		Description:               j.Description,
		EmploymentType:            j.EmploymentType,
		Location:                  j.Location,
		IsActive:                  j.IsActive,
		Status:                    j.Status,
		JobCategory:               j.JobCategory,
		HiringCount:               j.HiringCount,
		AppealPoints:              j.AppealPoints,
		Challenges:                j.Challenges,
		TeamDescription:           j.TeamDescription,
		TeamMembers:               j.TeamMembers,
		TeamLabel:                 j.TeamLabel,
		TeamID:                    j.TeamID,
		SkillsGained:              j.SkillsGained,
		Tags:                      tags,
		RequiredQualifications:    j.RequiredQualifications,
		PreferredQualifications:   j.PreferredQualifications,
		WorkLocation:              j.WorkLocation,
		WorkLocationChangeScope:   j.WorkLocationChangeScope,
		JobDescriptionChangeScope: j.JobDescriptionChangeScope,
		ContractType:              j.ContractType,
		ProbationPeriod:           j.ProbationPeriod,
		WorkHours:                 j.WorkHours,
		BreakTime:                 j.BreakTime,
		Holidays:                  j.Holidays,
		SalaryMin:                 j.SalaryMin,
		SalaryMax:                 j.SalaryMax,
		SalaryDetail:              j.SalaryDetail,
		Insurance:                 j.Insurance,
		RemotePolicy:              j.RemotePolicy,
		Benefits:                  j.Benefits,
		SmokingPolicy:             j.SmokingPolicy,
		SelectionProcess:          j.SelectionProcess,
		CoverImageURL:             j.CoverImageURL,
		HighlightTitleRole:        j.HighlightTitleRole,
		HighlightTitleAppeal:      j.HighlightTitleAppeal,
		HighlightTitleChallenge:   j.HighlightTitleChallenge,
		HighlightTitleGrowth:      j.HighlightTitleGrowth,
		GalleryURLs:               galleryURLs,
		CreatedAt:                 j.CreatedAt,
		UpdatedAt:                 j.UpdatedAt,
	}
}
