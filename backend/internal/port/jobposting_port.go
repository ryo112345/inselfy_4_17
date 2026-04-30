package port

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/jobposting"
)

type JobPostingInputPort interface {
	Create(ctx context.Context, input jobposting.CreateJobPostingInput) error
	List(ctx context.Context, companyID string) error
	Get(ctx context.Context, companyID, jobID string) error
	GetPublic(ctx context.Context, jobID string) error
	ListPublic(ctx context.Context) error
	Update(ctx context.Context, companyID, jobID string, input jobposting.UpdateJobPostingInput) error
	Delete(ctx context.Context, companyID, jobID string) error
}

type JobPostingOutputPort interface {
	PresentJobPosting(ctx context.Context, j *jobposting.JobPosting) error
	PresentJobPostings(ctx context.Context, js []*jobposting.JobPosting) error
}

type JobPostingRepository interface {
	Create(ctx context.Context, j *jobposting.JobPosting) (*jobposting.JobPosting, error)
	GetByID(ctx context.Context, id string) (*jobposting.JobPosting, error)
	GetPublicByID(ctx context.Context, id string) (*jobposting.JobPosting, error)
	ListByCompanyID(ctx context.Context, companyID string) ([]*jobposting.JobPosting, error)
	ListPublic(ctx context.Context) ([]*jobposting.JobPosting, error)
	Update(ctx context.Context, j *jobposting.JobPosting) (*jobposting.JobPosting, error)
	Delete(ctx context.Context, id string) error
}
