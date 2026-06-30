package usecase

import (
	"context"
	"fmt"
	"strings"

	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/jobposting"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type JobPostingInteractor struct {
	repo   port.JobPostingRepository
	output port.JobPostingOutputPort
}

var _ port.JobPostingInputPort = (*JobPostingInteractor)(nil)

// jobPostingEntityConv is the goverter-generated create-input→entity mapper.
// See job_posting_entity_converter.go for its declaration.
var jobPostingEntityConv jobPostingEntityConverter = &jobPostingEntityConverterImpl{}

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

	if len(input.TeamMembers) > 5 {
		return fmt.Errorf("%w: team members must be 5 or fewer", domainerr.ErrBadRequest)
	}
	if err := validateSalary(input.SalaryMin, input.SalaryMax); err != nil {
		return err
	}

	status := input.Status
	if status == "" {
		status = "draft"
	}

	entity := jobPostingEntityConv.CreateInputToEntity(input)
	entity.Status = status
	entity.IsActive = status == "open"

	j, err := i.repo.Create(ctx, entity)
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

func (i *JobPostingInteractor) GetPublic(ctx context.Context, jobID string) error {
	j, err := i.repo.GetPublicByID(ctx, jobID)
	if err != nil {
		return err
	}
	return i.output.PresentJobPosting(ctx, j)
}

func (i *JobPostingInteractor) ListPublic(ctx context.Context) error {
	js, err := i.repo.ListPublic(ctx)
	if err != nil {
		return err
	}
	return i.output.PresentJobPostings(ctx, js)
}

func (i *JobPostingInteractor) SearchPublic(ctx context.Context, params jobposting.SearchPublicParams) error {
	if params.Limit <= 0 || params.Limit > 50 {
		params.Limit = 20
	}
	if params.Offset < 0 {
		params.Offset = 0
	}
	js, total, err := i.repo.SearchPublic(ctx, params)
	if err != nil {
		return err
	}
	return i.output.PresentJobPostingsPaginated(ctx, js, total)
}

func (i *JobPostingInteractor) Update(ctx context.Context, companyID, jobID string, input jobposting.UpdateJobPostingInput) error {
	existing, err := i.repo.GetByID(ctx, jobID)
	if err != nil {
		return err
	}
	if existing.CompanyID != companyID {
		return port.ErrForbidden
	}

	if len(input.TeamMembers) > 5 {
		return fmt.Errorf("%w: team members must be 5 or fewer", domainerr.ErrBadRequest)
	}
	if err := validateSalary(input.SalaryMin, input.SalaryMax); err != nil {
		return err
	}

	existing.Title = strings.TrimSpace(input.Title)
	existing.Description = strings.TrimSpace(input.Description)
	existing.EmploymentType = strings.TrimSpace(input.EmploymentType)
	existing.Location = input.Location
	existing.Status = input.Status
	existing.IsActive = input.Status == "open"
	existing.JobCategory = input.JobCategory
	existing.HiringCount = input.HiringCount
	existing.AppealPoints = input.AppealPoints
	existing.Challenges = input.Challenges
	existing.TeamDescription = input.TeamDescription
	existing.TeamMembers = input.TeamMembers
	existing.TeamLabel = input.TeamLabel
	existing.TeamID = input.TeamID
	existing.SkillsGained = input.SkillsGained
	existing.Tags = input.Tags
	existing.RequiredQualifications = input.RequiredQualifications
	existing.PreferredQualifications = input.PreferredQualifications
	existing.WorkLocation = input.WorkLocation
	existing.WorkLocationChangeScope = input.WorkLocationChangeScope
	existing.JobDescriptionChangeScope = input.JobDescriptionChangeScope
	existing.ContractType = input.ContractType
	existing.ProbationPeriod = input.ProbationPeriod
	existing.WorkHours = input.WorkHours
	existing.BreakTime = input.BreakTime
	existing.Holidays = input.Holidays
	existing.SalaryMin = input.SalaryMin
	existing.SalaryMax = input.SalaryMax
	existing.SalaryDetail = input.SalaryDetail
	existing.Insurance = input.Insurance
	existing.RemotePolicy = input.RemotePolicy
	existing.Benefits = input.Benefits
	existing.SmokingPolicy = input.SmokingPolicy
	existing.SelectionProcess = input.SelectionProcess
	existing.CoverImageURL = input.CoverImageURL
	existing.HighlightTitleRole = input.HighlightTitleRole
	existing.HighlightTitleAppeal = input.HighlightTitleAppeal
	existing.HighlightTitleChallenge = input.HighlightTitleChallenge
	existing.HighlightTitleGrowth = input.HighlightTitleGrowth
	existing.GalleryURLs = input.GalleryURLs

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

func validateSalary(min, max *int32) error {
	const maxSalary = 9999
	if min != nil && *min > maxSalary {
		return fmt.Errorf("%w: salary_min must be 9999 or less (万円)", domainerr.ErrBadRequest)
	}
	if max != nil && *max > maxSalary {
		return fmt.Errorf("%w: salary_max must be 9999 or less (万円)", domainerr.ErrBadRequest)
	}
	return nil
}
