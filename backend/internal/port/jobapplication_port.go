package port

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/jobapplication"
)

type JobApplicationInputPort interface {
	Apply(ctx context.Context, input jobapplication.ApplyInput) error
	ListByCompany(ctx context.Context, companyID string, status *string, limit, offset int) error
	ListByCandidate(ctx context.Context, candidateID string) error
	GetByID(ctx context.Context, companyID, applicationID string) error
	UpdateStatus(ctx context.Context, companyID, applicationID string, status jobapplication.Status) error
	Withdraw(ctx context.Context, candidateID, applicationID string) error
	CheckApplied(ctx context.Context, candidateID, jobPostingID string) error
}

type JobApplicationOutputPort interface {
	PresentJobApplication(ctx context.Context, a *jobapplication.JobApplicationWithDetails) error
	PresentJobApplications(ctx context.Context, apps []*jobapplication.JobApplicationWithDetails, total int) error
	PresentApplied(ctx context.Context, applied bool) error
	PresentOK(ctx context.Context) error
}

type JobApplicationRepository interface {
	Create(ctx context.Context, a *jobapplication.JobApplication) (*jobapplication.JobApplication, error)
	GetByID(ctx context.Context, id string) (*jobapplication.JobApplicationWithDetails, error)
	GetByCandidateAndJob(ctx context.Context, candidateID, jobPostingID string) (*jobapplication.JobApplication, error)
	ListByCompanyID(ctx context.Context, companyID string, status *string, limit, offset int) ([]*jobapplication.JobApplicationWithDetails, int, error)
	ListByCandidateID(ctx context.Context, candidateID string) ([]*jobapplication.JobApplicationWithDetails, error)
	UpdateStatus(ctx context.Context, id string, status jobapplication.Status) error
}
