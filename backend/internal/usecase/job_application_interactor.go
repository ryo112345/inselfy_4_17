package usecase

import (
	"context"
	"errors"
	"strings"

	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/jobapplication"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type JobApplicationInteractor struct {
	repo    port.JobApplicationRepository
	jobRepo port.JobPostingRepository
}

var _ port.JobApplicationInputPort = (*JobApplicationInteractor)(nil)

func NewJobApplicationInteractor(
	repo port.JobApplicationRepository,
	jobRepo port.JobPostingRepository,
) *JobApplicationInteractor {
	return &JobApplicationInteractor{repo: repo, jobRepo: jobRepo}
}

func (i *JobApplicationInteractor) Apply(ctx context.Context, input jobapplication.ApplyInput) (*jobapplication.JobApplicationWithDetails, error) {
	jp, err := i.jobRepo.GetPublicByID(ctx, input.JobPostingID)
	if err != nil {
		if errors.Is(err, domainerr.ErrNotFound) {
			return nil, jobapplication.ErrJobNotOpen
		}
		return nil, err
	}
	if jp.Status != "open" {
		return nil, jobapplication.ErrJobNotOpen
	}

	a := &jobapplication.JobApplication{
		JobPostingID: input.JobPostingID,
		CandidateID:  input.CandidateID,
		CompanyID:    jp.CompanyID,
		Status:       jobapplication.StatusApplied,
		Message:      strings.TrimSpace(input.Message),
	}
	created, err := i.repo.Create(ctx, a)
	if err != nil {
		return nil, err
	}

	detail, err := i.repo.GetByID(ctx, created.ID)
	if err != nil {
		return nil, err
	}
	return detail, nil
}

func (i *JobApplicationInteractor) ListByCompany(ctx context.Context, companyID string, filter jobapplication.ListFilter) ([]*jobapplication.JobApplicationWithDetails, int, error) {
	apps, total, err := i.repo.ListByCompanyID(ctx, companyID, filter)
	if err != nil {
		return nil, 0, err
	}
	return apps, total, nil
}

func (i *JobApplicationInteractor) ListByCandidate(ctx context.Context, candidateID string) ([]*jobapplication.JobApplicationWithDetails, int, error) {
	apps, err := i.repo.ListByCandidateID(ctx, candidateID)
	if err != nil {
		return nil, 0, err
	}
	return apps, len(apps), nil
}

func (i *JobApplicationInteractor) GetByID(ctx context.Context, companyID, applicationID string) (*jobapplication.JobApplicationWithDetails, error) {
	app, err := i.repo.GetByID(ctx, applicationID)
	if err != nil {
		return nil, err
	}
	if app.CompanyID != companyID {
		return nil, domainerr.ErrNotFound
	}
	return app, nil
}

func (i *JobApplicationInteractor) UpdateStatus(ctx context.Context, companyID, applicationID string, status jobapplication.Status) error {
	if err := jobapplication.ValidateStatus(status); err != nil {
		return err
	}
	app, err := i.repo.GetByID(ctx, applicationID)
	if err != nil {
		return err
	}
	if app.CompanyID != companyID {
		return domainerr.ErrNotFound
	}
	if err := i.repo.UpdateStatus(ctx, applicationID, status); err != nil {
		return err
	}
	return nil
}

func (i *JobApplicationInteractor) Withdraw(ctx context.Context, candidateID, applicationID string) error {
	app, err := i.repo.GetByID(ctx, applicationID)
	if err != nil {
		return err
	}
	if app.CandidateID != candidateID {
		return domainerr.ErrNotFound
	}
	if err := i.repo.UpdateStatus(ctx, applicationID, jobapplication.StatusWithdrawn); err != nil {
		return err
	}
	return nil
}

func (i *JobApplicationInteractor) CheckApplied(ctx context.Context, candidateID, jobPostingID string) (bool, error) {
	_, err := i.repo.GetByCandidateAndJob(ctx, candidateID, jobPostingID)
	if err != nil {
		if errors.Is(err, domainerr.ErrNotFound) {
			return false, nil
		}
		return false, err
	}
	return true, nil
}
