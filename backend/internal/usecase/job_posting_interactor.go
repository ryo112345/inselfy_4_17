package usecase

import (
	"context"
	"strings"

	"github.com/akiyama/inselfy/backend/internal/domain/jobposting"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type JobPostingInteractor struct {
	repo port.JobPostingRepository
}

var _ port.JobPostingInputPort = (*JobPostingInteractor)(nil)

// jobPostingEntityConv is the goverter-generated create-input→entity mapper.
// See job_posting_entity_converter.go for its declaration.
var jobPostingEntityConv jobPostingEntityConverter = &jobPostingEntityConverterImpl{}

func NewJobPostingInteractor(
	repo port.JobPostingRepository,
) *JobPostingInteractor {
	return &JobPostingInteractor{repo: repo}
}

func (i *JobPostingInteractor) Create(ctx context.Context, input jobposting.CreateJobPostingInput) (*jobposting.JobPosting, error) {
	input.Title = strings.TrimSpace(input.Title)
	input.Description = strings.TrimSpace(input.Description)
	input.EmploymentType = strings.TrimSpace(input.EmploymentType)

	status := input.Status
	if status == "" {
		status = "draft"
	}

	entity := jobPostingEntityConv.CreateInputToEntity(input)
	entity.Status = status
	entity.IsActive = status == "open"

	if err := jobposting.Validate(entity); err != nil {
		return nil, err
	}

	return i.repo.Create(ctx, entity)
}

func (i *JobPostingInteractor) List(ctx context.Context, companyID string) ([]*jobposting.JobPosting, error) {
	return i.repo.ListByCompanyID(ctx, companyID)
}

func (i *JobPostingInteractor) Get(ctx context.Context, companyID, jobID string) (*jobposting.JobPosting, error) {
	j, err := i.repo.GetByID(ctx, jobID)
	if err != nil {
		return nil, err
	}
	if j.CompanyID != companyID {
		return nil, port.ErrForbidden
	}
	return j, nil
}

func (i *JobPostingInteractor) GetPublic(ctx context.Context, jobID string) (*jobposting.JobPosting, error) {
	return i.repo.GetPublicByID(ctx, jobID)
}

func (i *JobPostingInteractor) ListPublic(ctx context.Context) ([]*jobposting.JobPosting, error) {
	return i.repo.ListPublic(ctx)
}

func (i *JobPostingInteractor) SearchPublic(ctx context.Context, params jobposting.SearchPublicParams) ([]*jobposting.JobPosting, int, error) {
	if params.Limit <= 0 || params.Limit > 50 {
		params.Limit = 20
	}
	if params.Offset < 0 {
		params.Offset = 0
	}
	return i.repo.SearchPublic(ctx, params)
}

func (i *JobPostingInteractor) Update(ctx context.Context, companyID, jobID string, input jobposting.UpdateJobPostingInput) (*jobposting.JobPosting, error) {
	existing, err := i.repo.GetByID(ctx, jobID)
	if err != nil {
		return nil, err
	}
	if existing.CompanyID != companyID {
		return nil, port.ErrForbidden
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

	if err := jobposting.Validate(existing); err != nil {
		return nil, err
	}

	return i.repo.Update(ctx, existing)
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
