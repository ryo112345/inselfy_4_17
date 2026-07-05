package port

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/jobapplication"
)

type JobApplicationInputPort interface {
	Apply(ctx context.Context, input jobapplication.ApplyInput) (*jobapplication.JobApplicationWithDetails, error)
	ListByCompany(ctx context.Context, companyID string, filter jobapplication.ListFilter) ([]*jobapplication.JobApplicationWithDetails, int, error)
	ListByCandidate(ctx context.Context, candidateID string) ([]*jobapplication.JobApplicationWithDetails, int, error)
	GetByID(ctx context.Context, companyID, applicationID string) (*jobapplication.JobApplicationWithDetails, error)
	UpdateStatus(ctx context.Context, companyID, applicationID string, status jobapplication.Status) error
	Withdraw(ctx context.Context, candidateID, applicationID string) error
	CheckApplied(ctx context.Context, candidateID, jobPostingID string) (bool, error)
}

type JobApplicationRepository interface {
	Create(ctx context.Context, a *jobapplication.JobApplication) (*jobapplication.JobApplication, error)
	GetByID(ctx context.Context, id string) (*jobapplication.JobApplicationWithDetails, error)
	GetByCandidateAndJob(ctx context.Context, candidateID, jobPostingID string) (*jobapplication.JobApplication, error)
	ListByCompanyID(ctx context.Context, companyID string, filter jobapplication.ListFilter) ([]*jobapplication.JobApplicationWithDetails, int, error)
	ListByCandidateID(ctx context.Context, candidateID string) ([]*jobapplication.JobApplicationWithDetails, error)
	UpdateStatus(ctx context.Context, id string, status jobapplication.Status) error
}
