package sqlc

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/jobposting"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type JobPostingRepository struct {
	pool    *pgxpool.Pool
	queries *generated.Queries
}

var _ port.JobPostingRepository = (*JobPostingRepository)(nil)

func NewJobPostingRepository(pool *pgxpool.Pool) *JobPostingRepository {
	return &JobPostingRepository{pool: pool, queries: generated.New(pool)}
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

func (r *JobPostingRepository) SearchPublic(ctx context.Context, params jobposting.SearchPublicParams) ([]*jobposting.JobPosting, int, error) {
	if len(params.ValueFilters) > 0 {
		return r.searchPublicWithValueFilters(ctx, params)
	}

	q := queriesForContext(ctx, r.queries)

	filterParams := searchFilterParams(params)
	rows, err := q.SearchPublicJobPostings(ctx, &generated.SearchPublicJobPostingsParams{
		SearchTerm:     filterParams.SearchTerm,
		JobCategory:    filterParams.JobCategory,
		EmploymentType: filterParams.EmploymentType,
		RemotePolicy:   filterParams.RemotePolicy,
		SortBySalary:   params.SortBySalary,
		LimitVal:       int32(params.Limit),
		OffsetVal:      int32(params.Offset),
	})
	if err != nil {
		return nil, 0, err
	}

	count, err := q.CountPublicJobPostings(ctx, &generated.CountPublicJobPostingsParams{
		SearchTerm:     filterParams.SearchTerm,
		JobCategory:    filterParams.JobCategory,
		EmploymentType: filterParams.EmploymentType,
		RemotePolicy:   filterParams.RemotePolicy,
	})
	if err != nil {
		return nil, 0, err
	}

	postings := make([]*jobposting.JobPosting, len(rows))
	for i, row := range rows {
		postings[i] = searchPublicJobPostingToDomain(row)
	}
	return postings, int(count), nil
}

func (r *JobPostingRepository) searchPublicWithValueFilters(ctx context.Context, params jobposting.SearchPublicParams) ([]*jobposting.JobPosting, int, error) {
	args := []any{}
	argIdx := 1
	arg := func(v any) string {
		args = append(args, v)
		s := fmt.Sprintf("$%d", argIdx)
		argIdx++
		return s
	}

	var qualifyingCTE string
	if params.FilterMode == "needs" {
		qualifyingCTE = r.buildNeedsQualifyingCTE(params.ValueFilters, arg)
	} else {
		qualifyingCTE = r.buildValuesQualifyingCTE(params.ValueFilters, arg)
	}

	textFilters := buildTextFilters(params, arg)

	orderBy := "jp.created_at DESC"
	if params.SortBySalary {
		orderBy = "COALESCE(jp.salary_max, jp.salary_min, 0) DESC, jp.created_at DESC"
	}

	query := fmt.Sprintf(`%s
SELECT jp.*,
       ca.company_name,
       ca.logo_url AS company_logo_url
FROM job_postings jp
JOIN company_accounts ca ON ca.id = jp.company_id
WHERE jp.status = 'open'
  AND jp.team_id IN (SELECT team_id FROM qualifying_teams)
  %s
ORDER BY %s
LIMIT %s OFFSET %s`,
		qualifyingCTE,
		textFilters,
		orderBy,
		arg(params.Limit),
		arg(params.Offset),
	)

	countQuery := fmt.Sprintf(`%s
SELECT COUNT(*) FROM job_postings jp
JOIN company_accounts ca ON ca.id = jp.company_id
WHERE jp.status = 'open'
  AND jp.team_id IN (SELECT team_id FROM qualifying_teams)
  %s`,
		qualifyingCTE,
		textFilters,
	)

	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	var postings []*jobposting.JobPosting
	for rows.Next() {
		p, err := scanJobPostingWithCompany(rows)
		if err != nil {
			return nil, 0, err
		}
		postings = append(postings, p)
	}
	if postings == nil {
		postings = []*jobposting.JobPosting{}
	}

	countArgs := args[:len(args)-2]
	var total int64
	if err := r.pool.QueryRow(ctx, countQuery, countArgs...).Scan(&total); err != nil {
		return nil, 0, err
	}

	return postings, int(total), nil
}

func (r *JobPostingRepository) buildValuesQualifyingCTE(filters []jobposting.ValueFilter, arg func(any) string) string {
	var conditions []string
	for _, f := range filters {
		conditions = append(conditions, fmt.Sprintf("(value_id = %s AND avg_score >= %s)", arg(f.ID), arg(f.MinScore)))
	}

	return fmt.Sprintf(`WITH latest_wv_sessions AS (
  SELECT DISTINCT ON (s.user_id) s.id AS session_id, s.user_id
  FROM work_values_sessions s
  WHERE s.status = 'completed'
  ORDER BY s.user_id, s.completed_at DESC
),
eligible_teams AS (
  SELECT tm.team_id
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id AND t.is_public = TRUE
  JOIN latest_wv_sessions ls ON ls.user_id = tm.user_id
  GROUP BY tm.team_id
  HAVING COUNT(*) >= 3
),
team_value_avgs AS (
  SELECT tm.team_id, ws.value_id, AVG(ws.display_score) AS avg_score
  FROM team_members tm
  JOIN latest_wv_sessions ls ON ls.user_id = tm.user_id
  JOIN work_values_scores ws ON ws.session_id = ls.session_id
  WHERE tm.team_id IN (SELECT team_id FROM eligible_teams)
  GROUP BY tm.team_id, ws.value_id
),
qualifying_teams AS (
  SELECT team_id FROM team_value_avgs
  WHERE %s
  GROUP BY team_id
  HAVING COUNT(*) = %s
)`, strings.Join(conditions, " OR "), arg(len(filters)))
}

func (r *JobPostingRepository) buildNeedsQualifyingCTE(filters []jobposting.ValueFilter, arg func(any) string) string {
	var conditions []string
	for _, f := range filters {
		conditions = append(conditions, fmt.Sprintf("(need_id = %s AND avg_score >= %s)", arg(f.ID), arg(f.MinScore)))
	}

	return fmt.Sprintf(`WITH latest_wv_sessions AS (
  SELECT DISTINCT ON (s.user_id) s.id AS session_id, s.user_id
  FROM work_values_sessions s
  WHERE s.status = 'completed'
  ORDER BY s.user_id, s.completed_at DESC
),
eligible_teams AS (
  SELECT tm.team_id
  FROM team_members tm
  JOIN teams t ON t.id = tm.team_id AND t.is_public = TRUE
  JOIN latest_wv_sessions ls ON ls.user_id = tm.user_id
  JOIN work_needs_scores wns ON wns.session_id = ls.session_id
  GROUP BY tm.team_id
  HAVING COUNT(*) >= 3
),
team_need_avgs AS (
  SELECT
    tm.team_id,
    kv.key AS need_id,
    AVG(100.0 / (1.0 + EXP(-(kv.value::text)::float8))) AS avg_score
  FROM team_members tm
  JOIN latest_wv_sessions ls ON ls.user_id = tm.user_id
  JOIN work_needs_scores wns ON wns.session_id = ls.session_id
  CROSS JOIN LATERAL jsonb_each(wns.mu) AS kv
  WHERE tm.team_id IN (SELECT team_id FROM eligible_teams)
  GROUP BY tm.team_id, kv.key
),
qualifying_teams AS (
  SELECT team_id FROM team_need_avgs
  WHERE %s
  GROUP BY team_id
  HAVING COUNT(*) = %s
)`, strings.Join(conditions, " OR "), arg(len(filters)))
}

func buildTextFilters(params jobposting.SearchPublicParams, arg func(any) string) string {
	var clauses []string
	if params.Search != nil {
		p := arg("%" + *params.Search + "%")
		clauses = append(clauses, fmt.Sprintf(
			`AND (jp.title ILIKE %[1]s OR jp.description ILIKE %[1]s OR ca.company_name ILIKE %[1]s OR EXISTS(SELECT 1 FROM unnest(jp.tags) t WHERE t ILIKE %[1]s))`, p))
	}
	if params.JobCategory != nil {
		clauses = append(clauses, fmt.Sprintf("AND jp.job_category = %s", arg(*params.JobCategory)))
	}
	if params.EmploymentType != nil {
		clauses = append(clauses, fmt.Sprintf("AND jp.employment_type = %s", arg(*params.EmploymentType)))
	}
	if params.RemotePolicy != nil {
		clauses = append(clauses, fmt.Sprintf("AND jp.remote_policy = %s", arg(*params.RemotePolicy)))
	}
	return strings.Join(clauses, "\n  ")
}

func scanJobPostingWithCompany(rows pgx.Rows) (*jobposting.JobPosting, error) {
	var (
		id, companyID, teamID                                                            pgtype.UUID
		title, description, employmentType, status, jobCategory, hiringCount             string
		appealPoints, challenges, teamDescription, teamLabel, skillsGained               string
		reqQual, prefQual, workLocation, wlChangeScope, jdChangeScope                    string
		contractType, probationPeriod, workHours, breakTime, holidays                    string
		salaryDetail, insurance, remotePolicy, benefits, smokingPolicy, selectionProcess string
		coverImageURL, hlRole, hlAppeal, hlChallenge, hlGrowth                           string
		location                                                                         pgtype.Text
		isActive                                                                         bool
		salaryMin, salaryMax                                                             pgtype.Int4
		tags                                                                             []string
		teamMembersJSON, galleryURLsJSON                                                 []byte
		createdAt, updatedAt                                                             pgtype.Timestamptz
		companyName, companyLogoURL                                                      string
	)

	err := rows.Scan(
		&id, &companyID, &title, &description, &employmentType, &location,
		&isActive, &createdAt, &updatedAt, &status,
		&jobCategory, &hiringCount, &appealPoints, &challenges, &teamDescription,
		&skillsGained, &tags, &reqQual, &prefQual,
		&workLocation, &wlChangeScope, &jdChangeScope,
		&contractType, &probationPeriod, &workHours, &breakTime, &holidays,
		&salaryMin, &salaryMax, &salaryDetail, &insurance, &remotePolicy,
		&benefits, &smokingPolicy, &selectionProcess, &coverImageURL,
		&hlRole, &hlAppeal, &hlChallenge, &hlGrowth,
		&teamMembersJSON, &teamLabel, &galleryURLsJSON, &teamID,
		&companyName, &companyLogoURL,
	)
	if err != nil {
		return nil, err
	}

	if tags == nil {
		tags = []string{}
	}
	var teamMembers []jobposting.TeamMember
	if len(teamMembersJSON) > 0 {
		_ = json.Unmarshal(teamMembersJSON, &teamMembers)
	}
	if teamMembers == nil {
		teamMembers = []jobposting.TeamMember{}
	}
	var galleryURLs []string
	if len(galleryURLsJSON) > 0 {
		_ = json.Unmarshal(galleryURLsJSON, &galleryURLs)
	}
	if galleryURLs == nil {
		galleryURLs = []string{}
	}

	return &jobposting.JobPosting{
		ID:                        uuidToString(id),
		CompanyID:                 uuidToString(companyID),
		CompanyName:               companyName,
		CompanyLogoURL:            companyLogoURL,
		Title:                     title,
		Description:               description,
		EmploymentType:            employmentType,
		Location:                  textPtr(location),
		IsActive:                  isActive,
		Status:                    status,
		JobCategory:               jobCategory,
		HiringCount:               hiringCount,
		AppealPoints:              appealPoints,
		Challenges:                challenges,
		TeamDescription:           teamDescription,
		TeamMembers:               teamMembers,
		TeamLabel:                 teamLabel,
		TeamID:                    uuidPtr(teamID),
		SkillsGained:              skillsGained,
		Tags:                      tags,
		RequiredQualifications:    reqQual,
		PreferredQualifications:   prefQual,
		WorkLocation:              workLocation,
		WorkLocationChangeScope:   wlChangeScope,
		JobDescriptionChangeScope: jdChangeScope,
		ContractType:              contractType,
		ProbationPeriod:           probationPeriod,
		WorkHours:                 workHours,
		BreakTime:                 breakTime,
		Holidays:                  holidays,
		SalaryMin:                 int4Ptr(salaryMin),
		SalaryMax:                 int4Ptr(salaryMax),
		SalaryDetail:              salaryDetail,
		Insurance:                 insurance,
		RemotePolicy:              remotePolicy,
		Benefits:                  benefits,
		SmokingPolicy:             smokingPolicy,
		SelectionProcess:          selectionProcess,
		CoverImageURL:             coverImageURL,
		HighlightTitleRole:        hlRole,
		HighlightTitleAppeal:      hlAppeal,
		HighlightTitleChallenge:   hlChallenge,
		HighlightTitleGrowth:      hlGrowth,
		GalleryURLs:               galleryURLs,
		CreatedAt:                 createdAt.Time,
		UpdatedAt:                 updatedAt.Time,
	}, nil
}

type searchFilters struct {
	SearchTerm     pgtype.Text
	JobCategory    pgtype.Text
	EmploymentType pgtype.Text
	RemotePolicy   pgtype.Text
}

func searchFilterParams(params jobposting.SearchPublicParams) searchFilters {
	return searchFilters{
		SearchTerm:     pgText(params.Search),
		JobCategory:    pgText(params.JobCategory),
		EmploymentType: pgText(params.EmploymentType),
		RemotePolicy:   pgText(params.RemotePolicy),
	}
}

func searchPublicJobPostingToDomain(row *generated.SearchPublicJobPostingsRow) *jobposting.JobPosting {
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
