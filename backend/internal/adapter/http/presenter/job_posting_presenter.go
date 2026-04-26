package presenter

import (
	"context"
	"time"

	"github.com/akiyama/inselfy/backend/internal/domain/jobposting"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type jobPostingResponse struct {
	ID             string    `json:"id"`
	CompanyID      string    `json:"companyId"`
	Title          string    `json:"title"`
	Description    string    `json:"description"`
	EmploymentType string    `json:"employmentType"`
	Location       *string   `json:"location"`
	IsActive       bool      `json:"isActive"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

type JobPostingPresenter struct {
	single *jobPostingResponse
	list   []*jobPostingResponse
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

func (p *JobPostingPresenter) SingleResponse() *jobPostingResponse  { return p.single }
func (p *JobPostingPresenter) ListResponse() []*jobPostingResponse  { return p.list }

func toJobPostingResponse(j *jobposting.JobPosting) *jobPostingResponse {
	return &jobPostingResponse{
		ID:             j.ID,
		CompanyID:      j.CompanyID,
		Title:          j.Title,
		Description:    j.Description,
		EmploymentType: j.EmploymentType,
		Location:       j.Location,
		IsActive:       j.IsActive,
		CreatedAt:      j.CreatedAt,
		UpdatedAt:      j.UpdatedAt,
	}
}
