package port

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/jobposting"
)

type JobPostingInputPort interface {
	Create(ctx context.Context, input jobposting.CreateJobPostingInput) (*jobposting.JobPosting, error)
	List(ctx context.Context, companyID string) ([]*jobposting.JobPosting, error)
	Get(ctx context.Context, companyID, jobID string) (*jobposting.JobPosting, error)
	GetPublic(ctx context.Context, jobID string) (*jobposting.JobPosting, error)
	ListPublic(ctx context.Context) ([]*jobposting.JobPosting, error)
	SearchPublic(ctx context.Context, params jobposting.SearchPublicParams) ([]*jobposting.JobPosting, int, error)
	Update(ctx context.Context, companyID, jobID string, input jobposting.UpdateJobPostingInput) (*jobposting.JobPosting, error)
	Delete(ctx context.Context, companyID, jobID string) error
}

type JobPostingRepository interface {
	Create(ctx context.Context, j *jobposting.JobPosting) (*jobposting.JobPosting, error)
	GetByID(ctx context.Context, id string) (*jobposting.JobPosting, error)
	GetPublicByID(ctx context.Context, id string) (*jobposting.JobPosting, error)
	ListByCompanyID(ctx context.Context, companyID string) ([]*jobposting.JobPosting, error)
	ListPublic(ctx context.Context) ([]*jobposting.JobPosting, error)
	SearchPublic(ctx context.Context, params jobposting.SearchPublicParams) ([]*jobposting.JobPosting, int, error)
	Update(ctx context.Context, j *jobposting.JobPosting) (*jobposting.JobPosting, error)
	Delete(ctx context.Context, id string) error
}
