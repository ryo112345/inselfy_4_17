package presenter

import (
	"context"
	"time"

	"github.com/akiyama/inselfy/backend/internal/domain/jobapplication"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type jobApplicationResponse struct {
	ID                 string    `json:"id"`
	JobPostingID       string    `json:"jobPostingId"`
	CandidateID        string    `json:"candidateId"`
	CompanyID          string    `json:"companyId"`
	Status             string    `json:"status"`
	Message            string    `json:"message"`
	JobTitle           string    `json:"jobTitle"`
	CompanyName        string    `json:"companyName"`
	CandidateName      string    `json:"candidateName"`
	CandidateAvatar    string    `json:"candidateAvatar"`
	CandidateUsername  string    `json:"candidateUsername"`
	CandidateHeadline string    `json:"candidateHeadline"`
	CreatedAt          time.Time `json:"createdAt"`
	UpdatedAt          time.Time `json:"updatedAt"`
}

type jobApplicationListResponse struct {
	Items []*jobApplicationResponse `json:"items"`
	Total int                       `json:"total"`
}

type appliedResponse struct {
	Applied bool `json:"applied"`
}

type JobApplicationPresenter struct {
	single  *jobApplicationResponse
	list    *jobApplicationListResponse
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
	items := make([]*jobApplicationResponse, len(apps))
	for i, a := range apps {
		items[i] = toJobApplicationResponse(a)
	}
	p.list = &jobApplicationListResponse{Items: items, Total: total}
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

func (p *JobApplicationPresenter) SingleResponse() *jobApplicationResponse       { return p.single }
func (p *JobApplicationPresenter) ListResponse() *jobApplicationListResponse     { return p.list }
func (p *JobApplicationPresenter) AppliedResponse() *appliedResponse             { return p.applied }
func (p *JobApplicationPresenter) IsOK() bool                                    { return p.ok }

func toJobApplicationResponse(a *jobapplication.JobApplicationWithDetails) *jobApplicationResponse {
	return &jobApplicationResponse{
		ID:                 a.ID,
		JobPostingID:       a.JobPostingID,
		CandidateID:        a.CandidateID,
		CompanyID:          a.CompanyID,
		Status:             string(a.Status),
		Message:            a.Message,
		JobTitle:           a.JobTitle,
		CompanyName:        a.CompanyName,
		CandidateName:      a.CandidateName,
		CandidateAvatar:    a.CandidateAvatar,
		CandidateUsername:  a.CandidateUsername,
		CandidateHeadline: a.CandidateHeadline,
		CreatedAt:          a.CreatedAt,
		UpdatedAt:          a.UpdatedAt,
	}
}
