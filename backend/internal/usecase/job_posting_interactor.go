package usecase

import (
	"context"
	"strings"

	"github.com/akiyama/inselfy/backend/internal/domain/jobposting"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type JobPostingInteractor struct {
	repo   port.JobPostingRepository
	output port.JobPostingOutputPort
}

var _ port.JobPostingInputPort = (*JobPostingInteractor)(nil)

func NewJobPostingInteractor(
	repo port.JobPostingRepository,
	output port.JobPostingOutputPort,
) *JobPostingInteractor {
	return &JobPostingInteractor{repo: repo, output: output}
}

func (i *JobPostingInteractor) Create(ctx context.Context, input jobposting.CreateJobPostingInput) error {
	input.Title = strings.TrimSpace(input.Title)
	input.Description = strings.TrimSpace(input.Description)
	input.EmploymentType = strings.TrimSpace(input.EmploymentType)

	j, err := i.repo.Create(ctx, &jobposting.JobPosting{
		CompanyID:      input.CompanyID,
		Title:          input.Title,
		Description:    input.Description,
		EmploymentType: input.EmploymentType,
		Location:       input.Location,
		IsActive:       true,
	})
	if err != nil {
		return err
	}
	return i.output.PresentJobPosting(ctx, j)
}

func (i *JobPostingInteractor) List(ctx context.Context, companyID string) error {
	js, err := i.repo.ListByCompanyID(ctx, companyID)
	if err != nil {
		return err
	}
	return i.output.PresentJobPostings(ctx, js)
}

func (i *JobPostingInteractor) Get(ctx context.Context, companyID, jobID string) error {
	j, err := i.repo.GetByID(ctx, jobID)
	if err != nil {
		return err
	}
	if j.CompanyID != companyID {
		return port.ErrForbidden
	}
	return i.output.PresentJobPosting(ctx, j)
}

func (i *JobPostingInteractor) Update(ctx context.Context, companyID, jobID string, input jobposting.UpdateJobPostingInput) error {
	existing, err := i.repo.GetByID(ctx, jobID)
	if err != nil {
		return err
	}
	if existing.CompanyID != companyID {
		return port.ErrForbidden
	}

	existing.Title = strings.TrimSpace(input.Title)
	existing.Description = strings.TrimSpace(input.Description)
	existing.EmploymentType = strings.TrimSpace(input.EmploymentType)
	existing.Location = input.Location
	if input.IsActive != nil {
		existing.IsActive = *input.IsActive
	}

	j, err := i.repo.Update(ctx, existing)
	if err != nil {
		return err
	}
	return i.output.PresentJobPosting(ctx, j)
}

func (i *JobPostingInteractor) Delete(ctx context.Context, companyID, jobID string) error {
	j, err := i.repo.GetByID(ctx, jobID)
	if err != nil {
		return err
	}
	if j.CompanyID != companyID {
		return port.ErrForbidden
	}
	return i.repo.Delete(ctx, jobID)
}
