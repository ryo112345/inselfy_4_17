package controller

import (
	"fmt"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/domain/jobposting"
	"github.com/akiyama/inselfy/backend/internal/port"
	"github.com/akiyama/inselfy/backend/internal/usecase"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

type CompanyJobController struct {
	interactor *usecase.JobPostingInteractor
	storage    port.FileStorage
}

func NewCompanyJobController(i *usecase.JobPostingInteractor, s port.FileStorage) *CompanyJobController {
	return &CompanyJobController{interactor: i, storage: s}
}

type blockImageRequest struct {
	URL          string `json:"url"`
	Filename     string `json:"filename,omitempty"`
	Caption      string `json:"caption,omitempty"`
	CaptionAlign string `json:"caption_align,omitempty"`
	AspectRatio  string `json:"aspect_ratio,omitempty"`
}

type thumbnailRequest struct {
	URL      string `json:"url"`
	Filename string `json:"filename,omitempty"`
}

type contentBlockRequest struct {
	ID           string `json:"id"`
	Type         string `json:"type"`
	Key          string `json:"key"`
	Title        string `json:"title"`
	Body         string `json:"body"`
	Icon         string `json:"icon,omitempty"`
	Color        string `json:"color,omitempty"`
	Width        string `json:"width,omitempty"`
	Images            []blockImageRequest `json:"images,omitempty"`
	ImageURL          string `json:"image_url,omitempty"`
	ImageFilename     string `json:"image_filename,omitempty"`
	ImageCaption      string `json:"image_caption,omitempty"`
	ImageCaptionAlign string `json:"image_caption_align,omitempty"`
	ImageAspectRatio  string `json:"image_aspect_ratio,omitempty"`
	GroupID           string `json:"group_id,omitempty"`
	Align             string `json:"align,omitempty"`
}

type jobPostingRequest struct {
	TeamID                    *string               `json:"team_id"`
	Title                     string                `json:"title"`
	JobCategory               string                `json:"job_category"`
	EmploymentType            string                `json:"employment_type"`
	HiringCount               string                `json:"hiring_count"`
	Description               string                `json:"description"`
	AppealPoints              string                `json:"appeal_points"`
	Challenges                string                `json:"challenges"`
	TeamDescription           string                `json:"team_description"`
	SkillsGained              string                `json:"skills_gained"`
	ContentBlocks             []contentBlockRequest  `json:"content_blocks"`
	Template                  string                `json:"template"`
	Catchphrase               string                `json:"catchphrase"`
	Tags                      []string              `json:"tags"`
	ThumbnailURLs             []thumbnailRequest    `json:"thumbnail_urls"`
	RequiredQualifications    string                `json:"required_qualifications"`
	PreferredQualifications   string  `json:"preferred_qualifications"`
	WorkLocation              string  `json:"work_location"`
	WorkLocationChangeScope   string  `json:"work_location_change_scope"`
	JobDescriptionChangeScope string  `json:"job_description_change_scope"`
	ContractType              string  `json:"contract_type"`
	ContractPeriodDetail      string  `json:"contract_period_detail"`
	ProbationPeriod           string  `json:"probation_period"`
	WorkHours                 string  `json:"work_hours"`
	BreakTime                 string  `json:"break_time"`
	Holidays                  string  `json:"holidays"`
	SalaryMin                 *int32  `json:"salary_min"`
	SalaryMax                 *int32  `json:"salary_max"`
	SalaryDetail              string  `json:"salary_detail"`
	Insurance                 string  `json:"insurance"`
	SmokingPolicy             string  `json:"smoking_policy"`
	Benefits                  string  `json:"benefits"`
	RemotePolicy              string  `json:"remote_policy"`
	SelectionProcess          string  `json:"selection_process"`
	Visibility                string  `json:"visibility"`
	ClosesAt                  *string `json:"closes_at"`
	Source                    string  `json:"source,omitempty"`
}

func (req *jobPostingRequest) toDomain(companyID uuid.UUID, createdBy *uuid.UUID) *jobposting.JobPosting {
	var blocks []jobposting.ContentBlock
	for _, b := range req.ContentBlocks {
		var images []jobposting.BlockImage
		for _, img := range b.Images {
			images = append(images, jobposting.BlockImage{
				URL: img.URL, Filename: img.Filename, Caption: img.Caption,
				CaptionAlign: img.CaptionAlign, AspectRatio: img.AspectRatio,
			})
		}
		blocks = append(blocks, jobposting.ContentBlock{
			ID: b.ID, Type: b.Type, Key: b.Key, Title: b.Title, Body: b.Body,
			Icon: b.Icon, Color: b.Color, Width: b.Width,
			Images: images,
			ImageURL: b.ImageURL, ImageFilename: b.ImageFilename, ImageCaption: b.ImageCaption, ImageCaptionAlign: b.ImageCaptionAlign, ImageAspectRatio: b.ImageAspectRatio,
			GroupID: b.GroupID, Align: b.Align,
		})
	}
	var thumbs []jobposting.Thumbnail
	for _, t := range req.ThumbnailURLs {
		if strings.TrimSpace(t.URL) == "" {
			continue
		}
		thumbs = append(thumbs, jobposting.Thumbnail{URL: t.URL, Filename: t.Filename})
	}
	jp := &jobposting.JobPosting{
		CompanyID:                 companyID,
		Title:                     req.Title,
		JobCategory:               req.JobCategory,
		EmploymentType:            req.EmploymentType,
		HiringCount:               req.HiringCount,
		Description:               req.Description,
		AppealPoints:              req.AppealPoints,
		Challenges:                req.Challenges,
		TeamDescription:           req.TeamDescription,
		SkillsGained:              req.SkillsGained,
		ContentBlocks:             blocks,
		Template:                  req.Template,
		Catchphrase:               req.Catchphrase,
		Tags:                      req.Tags,
		ThumbnailURLs:             thumbs,
		RequiredQualifications:    req.RequiredQualifications,
		PreferredQualifications:   req.PreferredQualifications,
		WorkLocation:              req.WorkLocation,
		WorkLocationChangeScope:   req.WorkLocationChangeScope,
		JobDescriptionChangeScope: req.JobDescriptionChangeScope,
		ContractType:              req.ContractType,
		ContractPeriodDetail:      req.ContractPeriodDetail,
		ProbationPeriod:           req.ProbationPeriod,
		WorkHours:                 req.WorkHours,
		BreakTime:                 req.BreakTime,
		Holidays:                  req.Holidays,
		SalaryMin:                 req.SalaryMin,
		SalaryMax:                 req.SalaryMax,
		SalaryDetail:              req.SalaryDetail,
		Insurance:                 req.Insurance,
		SmokingPolicy:             req.SmokingPolicy,
		Benefits:                  req.Benefits,
		RemotePolicy:              req.RemotePolicy,
		SelectionProcess:          req.SelectionProcess,
		Visibility:                req.Visibility,
		CreatedBy:                 createdBy,
	}
	if req.TeamID != nil && *req.TeamID != "" {
		if tid, err := uuid.Parse(*req.TeamID); err == nil {
			jp.TeamID = &tid
		}
	}
	return jp
}

// thumbnailsOrEmpty returns an empty slice when ThumbnailURLs is nil so the
// JSON response always carries `[]` rather than `null`.
func thumbnailsOrEmpty(thumbs []jobposting.Thumbnail) []jobposting.Thumbnail {
	if thumbs == nil {
		return []jobposting.Thumbnail{}
	}
	return thumbs
}

func jobPostingToJSON(jp *jobposting.JobPosting) map[string]any {
	m := map[string]any{
		"id":                          jp.ID.String(),
		"company_id":                  jp.CompanyID.String(),
		"title":                       jp.Title,
		"job_category":                jp.JobCategory,
		"employment_type":             jp.EmploymentType,
		"hiring_count":                jp.HiringCount,
		"description":                 jp.Description,
		"appeal_points":               jp.AppealPoints,
		"challenges":                  jp.Challenges,
		"team_description":            jp.TeamDescription,
		"skills_gained":               jp.SkillsGained,
		"content_blocks":              jp.ContentBlocks,
		"template":                    jp.Template,
		"catchphrase":                 jp.Catchphrase,
		"tags":                        jp.Tags,
		"thumbnail_urls":              thumbnailsOrEmpty(jp.ThumbnailURLs),
		"required_qualifications":     jp.RequiredQualifications,
		"preferred_qualifications":    jp.PreferredQualifications,
		"work_location":               jp.WorkLocation,
		"work_location_change_scope":  jp.WorkLocationChangeScope,
		"job_description_change_scope": jp.JobDescriptionChangeScope,
		"contract_type":               jp.ContractType,
		"contract_period_detail":      jp.ContractPeriodDetail,
		"probation_period":            jp.ProbationPeriod,
		"work_hours":                  jp.WorkHours,
		"break_time":                  jp.BreakTime,
		"holidays":                    jp.Holidays,
		"salary_min":                  jp.SalaryMin,
		"salary_max":                  jp.SalaryMax,
		"salary_detail":               jp.SalaryDetail,
		"insurance":                   jp.Insurance,
		"smoking_policy":              jp.SmokingPolicy,
		"benefits":                    jp.Benefits,
		"remote_policy":               jp.RemotePolicy,
		"selection_process":           jp.SelectionProcess,
		"visibility":                  jp.Visibility,
		"status":                      jp.Status,
		"source":                      jp.Source,
		"created_at":                  jp.CreatedAt,
		"updated_at":                  jp.UpdatedAt,
	}
	if jp.TeamID != nil {
		m["team_id"] = jp.TeamID.String()
	}
	if jp.ClosesAt != nil {
		m["closes_at"] = jp.ClosesAt
	}
	if jp.CreatedBy != nil {
		m["created_by"] = jp.CreatedBy.String()
	}
	return m
}

// List handles GET /api/company/jobs
func (ctrl *CompanyJobController) List(c echo.Context) error {
	companyID := c.Get(middleware.ContextKeyCompanyID).(uuid.UUID)

	jobs, err := ctrl.interactor.ListByCompanyID(c.Request().Context(), companyID)
	if err != nil {
		return handleError(c, err)
	}

	result := make([]map[string]any, 0, len(jobs))
	for _, jp := range jobs {
		result = append(result, jobPostingToJSON(jp))
	}

	return c.JSON(http.StatusOK, map[string]any{"jobs": result})
}

// Create handles POST /api/company/jobs
func (ctrl *CompanyJobController) Create(c echo.Context) error {
	companyID := c.Get(middleware.ContextKeyCompanyID).(uuid.UUID)
	companyUserID := c.Get(middleware.ContextKeyCompanyUserID).(uuid.UUID)

	var req jobPostingRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{Code: "BAD_REQUEST", Message: "invalid request body"})
	}

	jp := req.toDomain(companyID, &companyUserID)

	created, err := ctrl.interactor.Create(c.Request().Context(), jp)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(http.StatusCreated, jobPostingToJSON(created))
}

// GetByID handles GET /api/company/jobs/:jobId
func (ctrl *CompanyJobController) GetByID(c echo.Context) error {
	companyID := c.Get(middleware.ContextKeyCompanyID).(uuid.UUID)
	jobID, err := uuid.Parse(c.Param("jobId"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{Code: "BAD_REQUEST", Message: "invalid job ID"})
	}

	jp, err := ctrl.interactor.GetByID(c.Request().Context(), jobID)
	if err != nil {
		return handleError(c, err)
	}

	if jp.CompanyID != companyID {
		return c.JSON(http.StatusForbidden, errorResponse{Code: "FORBIDDEN", Message: "not your job posting"})
	}

	return c.JSON(http.StatusOK, jobPostingToJSON(jp))
}

// Update handles PUT /api/company/jobs/:jobId
func (ctrl *CompanyJobController) Update(c echo.Context) error {
	companyID := c.Get(middleware.ContextKeyCompanyID).(uuid.UUID)
	jobID, err := uuid.Parse(c.Param("jobId"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{Code: "BAD_REQUEST", Message: "invalid job ID"})
	}

	var req jobPostingRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{Code: "BAD_REQUEST", Message: "invalid request body"})
	}

	jp := req.toDomain(companyID, nil)
	jp.ID = jobID

	updated, err := ctrl.interactor.Update(c.Request().Context(), jp)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(http.StatusOK, jobPostingToJSON(updated))
}

// UpdateStatus handles PATCH /api/company/jobs/:jobId/status
func (ctrl *CompanyJobController) UpdateStatus(c echo.Context) error {
	companyID := c.Get(middleware.ContextKeyCompanyID).(uuid.UUID)
	jobID, err := uuid.Parse(c.Param("jobId"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{Code: "BAD_REQUEST", Message: "invalid job ID"})
	}

	var req struct {
		Status string `json:"status"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{Code: "BAD_REQUEST", Message: "invalid request body"})
	}

	updated, err := ctrl.interactor.UpdateStatus(c.Request().Context(), jobID, companyID, req.Status)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(http.StatusOK, jobPostingToJSON(updated))
}

// Duplicate handles POST /api/company/jobs/:jobId/duplicate
func (ctrl *CompanyJobController) Duplicate(c echo.Context) error {
	companyID := c.Get(middleware.ContextKeyCompanyID).(uuid.UUID)
	companyUserID := c.Get(middleware.ContextKeyCompanyUserID).(uuid.UUID)
	jobID, err := uuid.Parse(c.Param("jobId"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{Code: "BAD_REQUEST", Message: "invalid job ID"})
	}

	duplicated, err := ctrl.interactor.Duplicate(c.Request().Context(), jobID, companyID, companyUserID)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(http.StatusCreated, jobPostingToJSON(duplicated))
}

// UploadImage handles POST /api/company/jobs/upload-image
func (ctrl *CompanyJobController) UploadImage(c echo.Context) error {
	file, err := c.FormFile("file")
	if err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{Code: "BAD_REQUEST", Message: "file is required"})
	}

	// Validate size (max 5MB)
	if file.Size > 5*1024*1024 {
		return c.JSON(http.StatusBadRequest, errorResponse{Code: "BAD_REQUEST", Message: "file too large (max 5MB)"})
	}

	// Validate content type
	ct := file.Header.Get("Content-Type")
	if !strings.HasPrefix(ct, "image/") {
		return c.JSON(http.StatusBadRequest, errorResponse{Code: "BAD_REQUEST", Message: "only image files are allowed"})
	}

	ext := filepath.Ext(file.Filename)
	if ext == "" {
		switch ct {
		case "image/jpeg":
			ext = ".jpg"
		case "image/png":
			ext = ".png"
		case "image/webp":
			ext = ".webp"
		default:
			ext = ".jpg"
		}
	}

	src, err := file.Open()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errorResponse{Code: "SERVER_ERROR", Message: "failed to read file"})
	}
	defer src.Close()

	filename := fmt.Sprintf("%s%s", uuid.New().String(), ext)
	key := "job-images/" + filename

	url, err := ctrl.storage.Save(c.Request().Context(), key, src)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errorResponse{Code: "SERVER_ERROR", Message: "failed to save file"})
	}

	return c.JSON(http.StatusOK, map[string]string{"url": url, "original_name": file.Filename})
}

// ListVersions handles GET /api/company/jobs/:jobId/versions
func (ctrl *CompanyJobController) ListVersions(c echo.Context) error {
	companyID := c.Get(middleware.ContextKeyCompanyID).(uuid.UUID)
	jobID, err := uuid.Parse(c.Param("jobId"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{Code: "BAD_REQUEST", Message: "invalid job ID"})
	}

	versions, err := ctrl.interactor.ListVersions(c.Request().Context(), jobID, companyID)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(http.StatusOK, map[string]any{"versions": versions})
}

// GetVersion handles GET /api/company/jobs/:jobId/versions/:versionId
func (ctrl *CompanyJobController) GetVersion(c echo.Context) error {
	companyID := c.Get(middleware.ContextKeyCompanyID).(uuid.UUID)
	jobID, err := uuid.Parse(c.Param("jobId"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{Code: "BAD_REQUEST", Message: "invalid job ID"})
	}
	versionID, err := uuid.Parse(c.Param("versionId"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{Code: "BAD_REQUEST", Message: "invalid version ID"})
	}

	version, err := ctrl.interactor.GetVersion(c.Request().Context(), jobID, versionID, companyID)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(http.StatusOK, version)
}

// RestoreVersion handles POST /api/company/jobs/:jobId/versions/:versionId/restore
func (ctrl *CompanyJobController) RestoreVersion(c echo.Context) error {
	companyID := c.Get(middleware.ContextKeyCompanyID).(uuid.UUID)
	jobID, err := uuid.Parse(c.Param("jobId"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{Code: "BAD_REQUEST", Message: "invalid job ID"})
	}
	versionID, err := uuid.Parse(c.Param("versionId"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{Code: "BAD_REQUEST", Message: "invalid version ID"})
	}

	restored, err := ctrl.interactor.RestoreVersion(c.Request().Context(), jobID, versionID, companyID)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(http.StatusOK, jobPostingToJSON(restored))
}

// ClearContent handles POST /api/company/jobs/:jobId/clear
func (ctrl *CompanyJobController) ClearContent(c echo.Context) error {
	companyID := c.Get(middleware.ContextKeyCompanyID).(uuid.UUID)
	jobID, err := uuid.Parse(c.Param("jobId"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{Code: "BAD_REQUEST", Message: "invalid job ID"})
	}

	cleared, err := ctrl.interactor.ClearContent(c.Request().Context(), jobID, companyID)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(http.StatusOK, jobPostingToJSON(cleared))
}

// ListApplications handles GET /api/company/applications
func (ctrl *CompanyJobController) ListApplications(c echo.Context) error {
	companyID := c.Get(middleware.ContextKeyCompanyID).(uuid.UUID)

	apps, err := ctrl.interactor.ListApplicationsByCompany(c.Request().Context(), companyID)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(http.StatusOK, map[string]any{"applications": apps})
}

// UpdateApplicationStatus handles PATCH /api/company/applications/:applicationId/status
func (ctrl *CompanyJobController) UpdateApplicationStatus(c echo.Context) error {
	companyID := c.Get(middleware.ContextKeyCompanyID).(uuid.UUID)
	appID, err := uuid.Parse(c.Param("applicationId"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{Code: "BAD_REQUEST", Message: "invalid application ID"})
	}

	var req struct {
		Status string `json:"status"`
	}
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{Code: "BAD_REQUEST", Message: "invalid request body"})
	}

	app, err := ctrl.interactor.UpdateApplicationStatus(c.Request().Context(), appID, companyID, req.Status)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(http.StatusOK, app)
}
