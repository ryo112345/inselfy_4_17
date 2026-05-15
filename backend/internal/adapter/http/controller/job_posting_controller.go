package controller

import (
	"fmt"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/domain/jobposting"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// JobPostingController handles job posting CRUD HTTP endpoints.
type JobPostingController struct {
	inputFactory  func(repo port.JobPostingRepository, output port.JobPostingOutputPort) port.JobPostingInputPort
	outputFactory func() *presenter.JobPostingPresenter
	repoFactory   func() port.JobPostingRepository
}

// NewJobPostingController creates a JobPostingController.
func NewJobPostingController(
	inputFactory func(repo port.JobPostingRepository, output port.JobPostingOutputPort) port.JobPostingInputPort,
	outputFactory func() *presenter.JobPostingPresenter,
	repoFactory func() port.JobPostingRepository,
) *JobPostingController {
	return &JobPostingController{
		inputFactory:  inputFactory,
		outputFactory: outputFactory,
		repoFactory:   repoFactory,
	}
}

type jobPostingRequest struct {
	Title                     string   `json:"title"`
	Description               string   `json:"description"`
	EmploymentType            string   `json:"employmentType"`
	Location                  *string  `json:"location"`
	Status                    string   `json:"status"`
	JobCategory               string   `json:"jobCategory"`
	HiringCount               string   `json:"hiringCount"`
	AppealPoints              string   `json:"appealPoints"`
	Challenges                string   `json:"challenges"`
	TeamDescription           string                    `json:"teamDescription"`
	TeamMembers               []jobposting.TeamMember   `json:"teamMembers"`
	TeamLabel                 string                    `json:"teamLabel"`
	TeamID                    *string                   `json:"teamId"`
	SkillsGained              string                    `json:"skillsGained"`
	Tags                      []string `json:"tags"`
	RequiredQualifications    string   `json:"requiredQualifications"`
	PreferredQualifications   string   `json:"preferredQualifications"`
	WorkLocation              string   `json:"workLocation"`
	WorkLocationChangeScope   string   `json:"workLocationChangeScope"`
	JobDescriptionChangeScope string   `json:"jobDescriptionChangeScope"`
	ContractType              string   `json:"contractType"`
	ProbationPeriod           string   `json:"probationPeriod"`
	WorkHours                 string   `json:"workHours"`
	BreakTime                 string   `json:"breakTime"`
	Holidays                  string   `json:"holidays"`
	SalaryMin                 *int32   `json:"salaryMin"`
	SalaryMax                 *int32   `json:"salaryMax"`
	SalaryDetail              string   `json:"salaryDetail"`
	Insurance                 string   `json:"insurance"`
	RemotePolicy              string   `json:"remotePolicy"`
	Benefits                  string   `json:"benefits"`
	SmokingPolicy             string   `json:"smokingPolicy"`
	SelectionProcess          string   `json:"selectionProcess"`
	CoverImageURL             string   `json:"coverImageUrl"`
	HighlightTitleRole        string   `json:"highlightTitleRole"`
	HighlightTitleAppeal      string   `json:"highlightTitleAppeal"`
	HighlightTitleChallenge   string   `json:"highlightTitleChallenge"`
	HighlightTitleGrowth      string   `json:"highlightTitleGrowth"`
	GalleryURLs               []string `json:"galleryUrls"`
}

// Create handles POST /api/company/jobs.
func (c *JobPostingController) Create(ctx echo.Context) error {
	companyID, ok := ctx.Get(authmw.CompanyIDKey).(string)
	if !ok || companyID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	var body jobPostingRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request body")
	}

	input, p := c.newIO()
	if err := input.Create(ctx.Request().Context(), jobposting.CreateJobPostingInput{
		CompanyID:                 companyID,
		Title:                     body.Title,
		Description:               body.Description,
		EmploymentType:            body.EmploymentType,
		Location:                  body.Location,
		Status:                    body.Status,
		JobCategory:               body.JobCategory,
		HiringCount:               body.HiringCount,
		AppealPoints:              body.AppealPoints,
		Challenges:                body.Challenges,
		TeamDescription:           body.TeamDescription,
		TeamMembers:               body.TeamMembers,
		TeamLabel:                 body.TeamLabel,
		TeamID:                    body.TeamID,
		SkillsGained:              body.SkillsGained,
		Tags:                      body.Tags,
		RequiredQualifications:    body.RequiredQualifications,
		PreferredQualifications:   body.PreferredQualifications,
		WorkLocation:              body.WorkLocation,
		WorkLocationChangeScope:   body.WorkLocationChangeScope,
		JobDescriptionChangeScope: body.JobDescriptionChangeScope,
		ContractType:              body.ContractType,
		ProbationPeriod:           body.ProbationPeriod,
		WorkHours:                 body.WorkHours,
		BreakTime:                 body.BreakTime,
		Holidays:                  body.Holidays,
		SalaryMin:                 body.SalaryMin,
		SalaryMax:                 body.SalaryMax,
		SalaryDetail:              body.SalaryDetail,
		Insurance:                 body.Insurance,
		RemotePolicy:              body.RemotePolicy,
		Benefits:                  body.Benefits,
		SmokingPolicy:             body.SmokingPolicy,
		SelectionProcess:          body.SelectionProcess,
		CoverImageURL:             body.CoverImageURL,
		HighlightTitleRole:        body.HighlightTitleRole,
		HighlightTitleAppeal:      body.HighlightTitleAppeal,
		HighlightTitleChallenge:   body.HighlightTitleChallenge,
		HighlightTitleGrowth:      body.HighlightTitleGrowth,
		GalleryURLs:               body.GalleryURLs,
	}); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, p.SingleResponse())
}

// List handles GET /api/company/jobs.
func (c *JobPostingController) List(ctx echo.Context) error {
	companyID, ok := ctx.Get(authmw.CompanyIDKey).(string)
	if !ok || companyID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	input, p := c.newIO()
	if err := input.List(ctx.Request().Context(), companyID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.ListResponse())
}

// Get handles GET /api/company/jobs/:jobId.
func (c *JobPostingController) Get(ctx echo.Context, jobID string) error {
	companyID, ok := ctx.Get(authmw.CompanyIDKey).(string)
	if !ok || companyID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	input, p := c.newIO()
	if err := input.Get(ctx.Request().Context(), companyID, jobID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.SingleResponse())
}

// ListPublic handles GET /api/jobs (no auth).
func (c *JobPostingController) ListPublic(ctx echo.Context) error {
	limit, _ := strconv.Atoi(ctx.QueryParam("limit"))
	offset, _ := strconv.Atoi(ctx.QueryParam("offset"))

	if limit > 0 {
		var params jobposting.SearchPublicParams
		params.Limit = limit
		params.Offset = offset
		if s := ctx.QueryParam("search"); s != "" {
			params.Search = &s
		}
		if v := ctx.QueryParam("category"); v != "" {
			params.JobCategory = &v
		}
		if v := ctx.QueryParam("employmentType"); v != "" {
			params.EmploymentType = &v
		}
		if v := ctx.QueryParam("remotePolicy"); v != "" {
			params.RemotePolicy = &v
		}
		params.SortBySalary = ctx.QueryParam("sort") == "salary"

		if vf := ctx.QueryParam("valueFilters"); vf != "" {
			params.FilterMode = ctx.QueryParam("filterMode")
			if params.FilterMode == "" {
				params.FilterMode = "values"
			}
			for _, pair := range strings.Split(vf, ",") {
				parts := strings.SplitN(pair, ":", 2)
				if len(parts) != 2 {
					continue
				}
				score, err := strconv.ParseFloat(parts[1], 64)
				if err != nil || score <= 0 {
					continue
				}
				params.ValueFilters = append(params.ValueFilters, jobposting.ValueFilter{
					ID:       parts[0],
					MinScore: score,
				})
			}
		}

		input, p := c.newIO()
		if err := input.SearchPublic(ctx.Request().Context(), params); err != nil {
			return handleError(ctx, err)
		}
		return ctx.JSON(http.StatusOK, p.PaginatedResponse())
	}

	input, p := c.newIO()
	if err := input.ListPublic(ctx.Request().Context()); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.ListResponse())
}

// GetPublic handles GET /api/jobs/:jobId (no auth).
func (c *JobPostingController) GetPublic(ctx echo.Context, jobID string) error {
	input, p := c.newIO()
	if err := input.GetPublic(ctx.Request().Context(), jobID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.SingleResponse())
}

// Update handles PUT /api/company/jobs/:jobId.
func (c *JobPostingController) Update(ctx echo.Context, jobID string) error {
	companyID, ok := ctx.Get(authmw.CompanyIDKey).(string)
	if !ok || companyID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	var body jobPostingRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request body")
	}

	input, p := c.newIO()
	if err := input.Update(ctx.Request().Context(), companyID, jobID, jobposting.UpdateJobPostingInput{
		Title:                     body.Title,
		Description:               body.Description,
		EmploymentType:            body.EmploymentType,
		Location:                  body.Location,
		Status:                    body.Status,
		JobCategory:               body.JobCategory,
		HiringCount:               body.HiringCount,
		AppealPoints:              body.AppealPoints,
		Challenges:                body.Challenges,
		TeamDescription:           body.TeamDescription,
		TeamMembers:               body.TeamMembers,
		TeamLabel:                 body.TeamLabel,
		TeamID:                    body.TeamID,
		SkillsGained:              body.SkillsGained,
		Tags:                      body.Tags,
		RequiredQualifications:    body.RequiredQualifications,
		PreferredQualifications:   body.PreferredQualifications,
		WorkLocation:              body.WorkLocation,
		WorkLocationChangeScope:   body.WorkLocationChangeScope,
		JobDescriptionChangeScope: body.JobDescriptionChangeScope,
		ContractType:              body.ContractType,
		ProbationPeriod:           body.ProbationPeriod,
		WorkHours:                 body.WorkHours,
		BreakTime:                 body.BreakTime,
		Holidays:                  body.Holidays,
		SalaryMin:                 body.SalaryMin,
		SalaryMax:                 body.SalaryMax,
		SalaryDetail:              body.SalaryDetail,
		Insurance:                 body.Insurance,
		RemotePolicy:              body.RemotePolicy,
		Benefits:                  body.Benefits,
		SmokingPolicy:             body.SmokingPolicy,
		SelectionProcess:          body.SelectionProcess,
		CoverImageURL:             body.CoverImageURL,
		HighlightTitleRole:        body.HighlightTitleRole,
		HighlightTitleAppeal:      body.HighlightTitleAppeal,
		HighlightTitleChallenge:   body.HighlightTitleChallenge,
		HighlightTitleGrowth:      body.HighlightTitleGrowth,
		GalleryURLs:               body.GalleryURLs,
	}); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.SingleResponse())
}

// Delete handles DELETE /api/company/jobs/:jobId.
func (c *JobPostingController) Delete(ctx echo.Context, jobID string) error {
	companyID, ok := ctx.Get(authmw.CompanyIDKey).(string)
	if !ok || companyID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	input, _ := c.newIO()
	if err := input.Delete(ctx.Request().Context(), companyID, jobID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.NoContent(http.StatusNoContent)
}

func (c *JobPostingController) newIO() (port.JobPostingInputPort, *presenter.JobPostingPresenter) {
	output := c.outputFactory()
	input := c.inputFactory(c.repoFactory(), output)
	return input, output
}

// HandleImageUpload returns a handler that saves an uploaded image via FileStorage.
func HandleImageUpload(storage port.FileStorage, subdir string) echo.HandlerFunc {
	return func(ctx echo.Context) error {
		file, err := ctx.FormFile("file")
		if err != nil {
			return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "file is required"})
		}
		if file.Size > 5*1024*1024 {
			return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "ファイルサイズは5MB以下にしてください"})
		}
		ext := strings.ToLower(filepath.Ext(file.Filename))
		if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp" {
			return ctx.JSON(http.StatusBadRequest, map[string]string{"message": "JPG、PNG、WebP形式のみ対応しています"})
		}

		src, err := file.Open()
		if err != nil {
			return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to open file"})
		}
		defer src.Close()

		key := fmt.Sprintf("%s/%s%s", subdir, uuid.New().String()[:8], ext)
		url, err := storage.Save(ctx.Request().Context(), key, src)
		if err != nil {
			return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to save file"})
		}

		return ctx.JSON(http.StatusOK, map[string]string{"url": url})
	}
}
