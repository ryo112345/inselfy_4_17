package sqlc

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/jobposting"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type JobPostingRepository struct {
	queries *generated.Queries
}

var _ port.JobPostingRepository = (*JobPostingRepository)(nil)

func NewJobPostingRepository(pool *pgxpool.Pool) *JobPostingRepository {
	return &JobPostingRepository{queries: generated.New(pool)}
}

func (r *JobPostingRepository) Create(ctx context.Context, j *jobposting.JobPosting) (*jobposting.JobPosting, error) {
	q := queriesForContext(ctx, r.queries)
	companyID, err := parseUUID(j.CompanyID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	teamMembersJSON, _ := json.Marshal(j.TeamMembers)
	galleryURLsJSON, _ := json.Marshal(j.GalleryURLs)
	row, err := q.CreateJobPosting(ctx, &generated.CreateJobPostingParams{
		CompanyID:                 companyID,
		Title:                     j.Title,
		Description:               j.Description,
		EmploymentType:            j.EmploymentType,
		Location:                  pgText(j.Location),
		Status:                    j.Status,
		JobCategory:               j.JobCategory,
		HiringCount:               j.HiringCount,
		AppealPoints:              j.AppealPoints,
		Challenges:                j.Challenges,
		TeamDescription:           j.TeamDescription,
		TeamMembers:               teamMembersJSON,
		TeamLabel:                 j.TeamLabel,
		TeamID:                    optionalUUID(j.TeamID),
		SkillsGained:              j.SkillsGained,
		Tags:                      j.Tags,
		RequiredQualifications:    j.RequiredQualifications,
		PreferredQualifications:   j.PreferredQualifications,
		WorkLocation:              j.WorkLocation,
		WorkLocationChangeScope:   j.WorkLocationChangeScope,
		JobDescriptionChangeScope: j.JobDescriptionChangeScope,
		ContractType:              j.ContractType,
		ProbationPeriod:           j.ProbationPeriod,
		WorkHours:                 j.WorkHours,
		BreakTime:                 j.BreakTime,
		Holidays:                  j.Holidays,
		SalaryMin:                 pgInt4(j.SalaryMin),
		SalaryMax:                 pgInt4(j.SalaryMax),
		SalaryDetail:              j.SalaryDetail,
		Insurance:                 j.Insurance,
		RemotePolicy:              j.RemotePolicy,
		Benefits:                  j.Benefits,
		SmokingPolicy:             j.SmokingPolicy,
		SelectionProcess:          j.SelectionProcess,
		CoverImageUrl:             j.CoverImageURL,
		HighlightTitleRole:        j.HighlightTitleRole,
		HighlightTitleAppeal:      j.HighlightTitleAppeal,
		HighlightTitleChallenge:   j.HighlightTitleChallenge,
		HighlightTitleGrowth:      j.HighlightTitleGrowth,
		GalleryUrls:               galleryURLsJSON,
	})
	if err != nil {
		return nil, err
	}
	return jobPostingToDomain(row), nil
}

func (r *JobPostingRepository) GetByID(ctx context.Context, id string) (*jobposting.JobPosting, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return nil, domainerr.ErrNotFound
	}
	row, err := q.GetJobPostingByID(ctx, pgID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	return jobPostingToDomain(row), nil
}

func (r *JobPostingRepository) GetPublicByID(ctx context.Context, id string) (*jobposting.JobPosting, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return nil, domainerr.ErrNotFound
	}
	row, err := q.GetPublicJobPostingByID(ctx, pgID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	return jobPostingToDomain(row), nil
}

func (r *JobPostingRepository) ListByCompanyID(ctx context.Context, companyID string) ([]*jobposting.JobPosting, error) {
	q := queriesForContext(ctx, r.queries)
	pgCompanyID, err := parseUUID(companyID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	rows, err := q.ListJobPostingsByCompanyID(ctx, pgCompanyID)
	if err != nil {
		return nil, err
	}
	postings := make([]*jobposting.JobPosting, len(rows))
	for i, row := range rows {
		postings[i] = jobPostingToDomain(row)
	}
	return postings, nil
}

func (r *JobPostingRepository) Update(ctx context.Context, j *jobposting.JobPosting) (*jobposting.JobPosting, error) {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(j.ID)
	if err != nil {
		return nil, domainerr.ErrBadRequest
	}
	teamMembersJSON, _ := json.Marshal(j.TeamMembers)
	galleryURLsJSON, _ := json.Marshal(j.GalleryURLs)
	row, err := q.UpdateJobPosting(ctx, &generated.UpdateJobPostingParams{
		ID:                        pgID,
		Title:                     j.Title,
		Description:               j.Description,
		EmploymentType:            j.EmploymentType,
		Location:                  pgText(j.Location),
		IsActive:                  j.IsActive,
		Status:                    j.Status,
		JobCategory:               j.JobCategory,
		HiringCount:               j.HiringCount,
		AppealPoints:              j.AppealPoints,
		Challenges:                j.Challenges,
		TeamDescription:           j.TeamDescription,
		TeamMembers:               teamMembersJSON,
		TeamLabel:                 j.TeamLabel,
		TeamID:                    optionalUUID(j.TeamID),
		SkillsGained:              j.SkillsGained,
		Tags:                      j.Tags,
		RequiredQualifications:    j.RequiredQualifications,
		PreferredQualifications:   j.PreferredQualifications,
		WorkLocation:              j.WorkLocation,
		WorkLocationChangeScope:   j.WorkLocationChangeScope,
		JobDescriptionChangeScope: j.JobDescriptionChangeScope,
		ContractType:              j.ContractType,
		ProbationPeriod:           j.ProbationPeriod,
		WorkHours:                 j.WorkHours,
		BreakTime:                 j.BreakTime,
		Holidays:                  j.Holidays,
		SalaryMin:                 pgInt4(j.SalaryMin),
		SalaryMax:                 pgInt4(j.SalaryMax),
		SalaryDetail:              j.SalaryDetail,
		Insurance:                 j.Insurance,
		RemotePolicy:              j.RemotePolicy,
		Benefits:                  j.Benefits,
		SmokingPolicy:             j.SmokingPolicy,
		SelectionProcess:          j.SelectionProcess,
		CoverImageUrl:             j.CoverImageURL,
		HighlightTitleRole:        j.HighlightTitleRole,
		HighlightTitleAppeal:      j.HighlightTitleAppeal,
		HighlightTitleChallenge:   j.HighlightTitleChallenge,
		HighlightTitleGrowth:      j.HighlightTitleGrowth,
		GalleryUrls:               galleryURLsJSON,
	})
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domainerr.ErrNotFound
		}
		return nil, err
	}
	return jobPostingToDomain(row), nil
}

func (r *JobPostingRepository) Delete(ctx context.Context, id string) error {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return domainerr.ErrNotFound
	}
	return q.DeleteJobPosting(ctx, pgID)
}

func (r *JobPostingRepository) ListPublic(ctx context.Context) ([]*jobposting.JobPosting, error) {
	q := queriesForContext(ctx, r.queries)
	rows, err := q.ListPublicJobPostings(ctx)
	if err != nil {
		return nil, err
	}
	postings := make([]*jobposting.JobPosting, len(rows))
	for i, row := range rows {
		postings[i] = publicJobPostingToDomain(row)
	}
	return postings, nil
}

func publicJobPostingToDomain(row *generated.ListPublicJobPostingsRow) *jobposting.JobPosting {
	tags := row.Tags
	if tags == nil {
		tags = []string{}
	}
	var teamMembers []jobposting.TeamMember
	if len(row.TeamMembers) > 0 {
		_ = json.Unmarshal(row.TeamMembers, &teamMembers)
	}
	if teamMembers == nil {
		teamMembers = []jobposting.TeamMember{}
	}
	var galleryURLs []string
	if len(row.GalleryUrls) > 0 {
		_ = json.Unmarshal(row.GalleryUrls, &galleryURLs)
	}
	if galleryURLs == nil {
		galleryURLs = []string{}
	}
	return &jobposting.JobPosting{
		ID:                        uuidToString(row.ID),
		CompanyID:                 uuidToString(row.CompanyID),
		CompanyName:               row.CompanyName,
		CompanyLogoURL:            row.CompanyLogoUrl,
		Title:                     row.Title,
		Description:               row.Description,
		EmploymentType:            row.EmploymentType,
		Location:                  textPtr(row.Location),
		IsActive:                  row.IsActive,
		Status:                    row.Status,
		JobCategory:               row.JobCategory,
		HiringCount:               row.HiringCount,
		AppealPoints:              row.AppealPoints,
		Challenges:                row.Challenges,
		TeamDescription:           row.TeamDescription,
		TeamMembers:               teamMembers,
		TeamLabel:                 row.TeamLabel,
		TeamID:                    uuidPtr(row.TeamID),
		SkillsGained:              row.SkillsGained,
		Tags:                      tags,
		RequiredQualifications:    row.RequiredQualifications,
		PreferredQualifications:   row.PreferredQualifications,
		WorkLocation:              row.WorkLocation,
		WorkLocationChangeScope:   row.WorkLocationChangeScope,
		JobDescriptionChangeScope: row.JobDescriptionChangeScope,
		ContractType:              row.ContractType,
		ProbationPeriod:           row.ProbationPeriod,
		WorkHours:                 row.WorkHours,
		BreakTime:                 row.BreakTime,
		Holidays:                  row.Holidays,
		SalaryMin:                 int4Ptr(row.SalaryMin),
		SalaryMax:                 int4Ptr(row.SalaryMax),
		SalaryDetail:              row.SalaryDetail,
		Insurance:                 row.Insurance,
		RemotePolicy:              row.RemotePolicy,
		Benefits:                  row.Benefits,
		SmokingPolicy:             row.SmokingPolicy,
		SelectionProcess:          row.SelectionProcess,
		CoverImageURL:             row.CoverImageUrl,
		HighlightTitleRole:        row.HighlightTitleRole,
		HighlightTitleAppeal:      row.HighlightTitleAppeal,
		HighlightTitleChallenge:   row.HighlightTitleChallenge,
		HighlightTitleGrowth:      row.HighlightTitleGrowth,
		GalleryURLs:               galleryURLs,
		CreatedAt:                 row.CreatedAt.Time,
		UpdatedAt:                 row.UpdatedAt.Time,
	}
}

func jobPostingToDomain(row *generated.JobPosting) *jobposting.JobPosting {
	tags := row.Tags
	if tags == nil {
		tags = []string{}
	}
	var teamMembers []jobposting.TeamMember
	if len(row.TeamMembers) > 0 {
		_ = json.Unmarshal(row.TeamMembers, &teamMembers)
	}
	if teamMembers == nil {
		teamMembers = []jobposting.TeamMember{}
	}
	var galleryURLs []string
	if len(row.GalleryUrls) > 0 {
		_ = json.Unmarshal(row.GalleryUrls, &galleryURLs)
	}
	if galleryURLs == nil {
		galleryURLs = []string{}
	}
	return &jobposting.JobPosting{
		ID:                        uuidToString(row.ID),
		CompanyID:                 uuidToString(row.CompanyID),
		Title:                     row.Title,
		Description:               row.Description,
		EmploymentType:            row.EmploymentType,
		Location:                  textPtr(row.Location),
		IsActive:                  row.IsActive,
		Status:                    row.Status,
		JobCategory:               row.JobCategory,
		HiringCount:               row.HiringCount,
		AppealPoints:              row.AppealPoints,
		Challenges:                row.Challenges,
		TeamDescription:           row.TeamDescription,
		TeamMembers:               teamMembers,
		TeamLabel:                 row.TeamLabel,
		TeamID:                    uuidPtr(row.TeamID),
		SkillsGained:              row.SkillsGained,
		Tags:                      tags,
		RequiredQualifications:    row.RequiredQualifications,
		PreferredQualifications:   row.PreferredQualifications,
		WorkLocation:              row.WorkLocation,
		WorkLocationChangeScope:   row.WorkLocationChangeScope,
		JobDescriptionChangeScope: row.JobDescriptionChangeScope,
		ContractType:              row.ContractType,
		ProbationPeriod:           row.ProbationPeriod,
		WorkHours:                 row.WorkHours,
		BreakTime:                 row.BreakTime,
		Holidays:                  row.Holidays,
		SalaryMin:                 int4Ptr(row.SalaryMin),
		SalaryMax:                 int4Ptr(row.SalaryMax),
		SalaryDetail:              row.SalaryDetail,
		Insurance:                 row.Insurance,
		RemotePolicy:              row.RemotePolicy,
		Benefits:                  row.Benefits,
		SmokingPolicy:             row.SmokingPolicy,
		SelectionProcess:          row.SelectionProcess,
		CoverImageURL:             row.CoverImageUrl,
		HighlightTitleRole:        row.HighlightTitleRole,
		HighlightTitleAppeal:      row.HighlightTitleAppeal,
		HighlightTitleChallenge:   row.HighlightTitleChallenge,
		HighlightTitleGrowth:      row.HighlightTitleGrowth,
		GalleryURLs:               galleryURLs,
		CreatedAt:                 row.CreatedAt.Time,
		UpdatedAt:                 row.UpdatedAt.Time,
	}
}
