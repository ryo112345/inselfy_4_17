package presenter

import (
	"context"
	"time"

	"github.com/akiyama/inselfy/backend/internal/domain/jobapplication"
	"github.com/akiyama/inselfy/backend/internal/port"
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

type JobApplicationPresenter struct {
	single  *JobApplicationResponse
	list    *JobApplicationListResponse
	applied *appliedResponse
	ok      bool
}

var _ port.JobApplicationOutputPort = (*JobApplicationPresenter)(nil)

func NewJobApplicationPresenter() *JobApplicationPresenter {
	return &JobApplicationPresenter{}
}

func (p *JobApplicationPresenter) PresentJobApplication(_ context.Context, a *jobapplication.JobApplicationWithDetails) error {
	p.single = toJobApplicationResponse(a)
	return nil
}

func (p *JobApplicationPresenter) PresentJobApplications(_ context.Context, apps []*jobapplication.JobApplicationWithDetails, total int) error {
	items := make([]*JobApplicationResponse, len(apps))
	for i, a := range apps {
		items[i] = toJobApplicationResponse(a)
	}
	p.list = &JobApplicationListResponse{Items: items, Total: total}
	return nil
}

func (p *JobApplicationPresenter) PresentApplied(_ context.Context, applied bool) error {
	p.applied = &appliedResponse{Applied: applied}
	return nil
}

func (p *JobApplicationPresenter) PresentOK(_ context.Context) error {
	p.ok = true
	return nil
}

func (p *JobApplicationPresenter) SingleResponse() *JobApplicationResponse       { return p.single }
func (p *JobApplicationPresenter) ListResponse() *JobApplicationListResponse     { return p.list }
func (p *JobApplicationPresenter) AppliedResponse() *appliedResponse             { return p.applied }
func (p *JobApplicationPresenter) IsOK() bool                                    { return p.ok }

func toJobApplicationResponse(a *jobapplication.JobApplicationWithDetails) *JobApplicationResponse {
	return &JobApplicationResponse{
		ID:                     a.ID,
		JobPostingID:           a.JobPostingID,
		CandidateID:            a.CandidateID,
		CompanyID:              a.CompanyID,
		Status:                 string(a.Status),
		Message:                a.Message,
		JobTitle:               a.JobTitle,
		CompanyName:            a.CompanyName,
		CandidateName:          a.CandidateName,
		CandidateAvatar:        a.CandidateAvatar,
		CandidateUsername:      a.CandidateUsername,
		CandidateHeadline:      a.CandidateHeadline,
		CandidateProfileColor:  a.CandidateProfileColor,
		CandidateSeekingStatus: a.CandidateSeekingStatus,
		CandidateSkills:        a.CandidateSkills,
		CreatedAt:              a.CreatedAt,
		UpdatedAt:              a.UpdatedAt,
	}
}
