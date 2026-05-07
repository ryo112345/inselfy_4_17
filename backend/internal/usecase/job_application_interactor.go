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
	output  port.JobApplicationOutputPort
}

var _ port.JobApplicationInputPort = (*JobApplicationInteractor)(nil)

func NewJobApplicationInteractor(
	repo port.JobApplicationRepository,
	jobRepo port.JobPostingRepository,
	output port.JobApplicationOutputPort,
) *JobApplicationInteractor {
	return &JobApplicationInteractor{repo: repo, jobRepo: jobRepo, output: output}
}

func (i *JobApplicationInteractor) Apply(ctx context.Context, input jobapplication.ApplyInput) error {
	jp, err := i.jobRepo.GetPublicByID(ctx, input.JobPostingID)
	if err != nil {
		if errors.Is(err, domainerr.ErrNotFound) {
			return jobapplication.ErrJobNotOpen
		}
		return err
	}
	if jp.Status != "open" {
		return jobapplication.ErrJobNotOpen
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
		return err
	}

	detail, err := i.repo.GetByID(ctx, created.ID)
	if err != nil {
		return err
	}
	return i.output.PresentJobApplication(ctx, detail)
}

func (i *JobApplicationInteractor) ListByCompany(ctx context.Context, companyID string, filter jobapplication.ListFilter) error {
	apps, total, err := i.repo.ListByCompanyID(ctx, companyID, filter)
	if err != nil {
		return err
	}
	return i.output.PresentJobApplications(ctx, apps, total)
}

func (i *JobApplicationInteractor) ListByCandidate(ctx context.Context, candidateID string) error {
	apps, err := i.repo.ListByCandidateID(ctx, candidateID)
	if err != nil {
		return err
	}
	return i.output.PresentJobApplications(ctx, apps, len(apps))
}

func (i *JobApplicationInteractor) GetByID(ctx context.Context, companyID, applicationID string) error {
	app, err := i.repo.GetByID(ctx, applicationID)
	if err != nil {
		return err
	}
	if app.CompanyID != companyID {
		return domainerr.ErrNotFound
	}
	return i.output.PresentJobApplication(ctx, app)
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
	return i.output.PresentOK(ctx)
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
	return i.output.PresentOK(ctx)
}

func (i *JobApplicationInteractor) CheckApplied(ctx context.Context, candidateID, jobPostingID string) error {
	_, err := i.repo.GetByCandidateAndJob(ctx, candidateID, jobPostingID)
	if err != nil {
		if errors.Is(err, domainerr.ErrNotFound) {
			return i.output.PresentApplied(ctx, false)
		}
		return err
	}
	return i.output.PresentApplied(ctx, true)
}
