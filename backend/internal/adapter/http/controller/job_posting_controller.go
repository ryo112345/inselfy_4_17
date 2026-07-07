package controller

import (
	"fmt"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/google/uuid"
	"github.com/labstack/echo/v4"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/domain/jobposting"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// JobPostingController handles job posting CRUD HTTP endpoints.
type JobPostingController struct {
	input port.JobPostingInputPort
}

// NewJobPostingController creates a JobPostingController.
func NewJobPostingController(
	input port.JobPostingInputPort,
) *JobPostingController {
	return &JobPostingController{input: input}
}

// Create handles POST /api/company/jobs.
func (c *JobPostingController) Create(ctx echo.Context) error {
	companyID := authmw.CompanyID(ctx)

	var body openapi.ModelsJobPostingRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request body")
	}

	in := jobPostingReqConv.ToCreateInput(body)
	in.CompanyID = companyID

	j, err := c.input.Create(ctx.Request().Context(), in)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusCreated, presenter.JobPostingResponse(j))
}

// List handles GET /api/company/jobs.
func (c *JobPostingController) List(ctx echo.Context) error {
	companyID := authmw.CompanyID(ctx)

	js, err := c.input.List(ctx.Request().Context(), companyID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.JobPostingsPaginatedResponse(js, len(js)))
}

// Get handles GET /api/company/jobs/:jobId.
func (c *JobPostingController) Get(ctx echo.Context, jobID string) error {
	companyID := authmw.CompanyID(ctx)

	j, err := c.input.Get(ctx.Request().Context(), companyID, jobID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.JobPostingResponse(j))
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

		js, total, err := c.input.SearchPublic(ctx.Request().Context(), params)
		if err != nil {
			return handleError(ctx, err)
		}
		return ctx.JSON(http.StatusOK, presenter.JobPostingsPaginatedResponse(js, total))
	}

	js, err := c.input.ListPublic(ctx.Request().Context())
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.JobPostingsPaginatedResponse(js, len(js)))
}

// GetPublic handles GET /api/jobs/:jobId (no auth).
func (c *JobPostingController) GetPublic(ctx echo.Context, jobID string) error {
	j, err := c.input.GetPublic(ctx.Request().Context(), jobID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.JobPostingResponse(j))
}

// Update handles PUT /api/company/jobs/:jobId.
func (c *JobPostingController) Update(ctx echo.Context, jobID string) error {
	companyID := authmw.CompanyID(ctx)

	var body openapi.ModelsJobPostingRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid request body")
	}

	j, err := c.input.Update(ctx.Request().Context(), companyID, jobID, jobPostingReqConv.ToUpdateInput(body))
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.JobPostingResponse(j))
}

// Delete handles DELETE /api/company/jobs/:jobId.
func (c *JobPostingController) Delete(ctx echo.Context, jobID string) error {
	companyID := authmw.CompanyID(ctx)

	if err := c.input.Delete(ctx.Request().Context(), companyID, jobID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.NoContent(http.StatusNoContent)
}

// jobPostingReqConv is the goverter-generated request→input mapper.
// See job_posting_request_converter.go for its declaration.
var jobPostingReqConv jobPostingRequestConverter = &jobPostingRequestConverterImpl{}

// HandleImageUpload returns a handler that saves an uploaded image via FileStorage.
func HandleImageUpload(storage port.FileStorage, subdir string) echo.HandlerFunc {
	return func(ctx echo.Context) error {
		file, err := ctx.FormFile("file")
		if err != nil {
			return badRequest(ctx, "file is required")
		}
		if file.Size > 5*1024*1024 {
			return badRequest(ctx, "ファイルサイズは5MB以下にしてください")
		}
		ext := strings.ToLower(filepath.Ext(file.Filename))
		if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp" {
			return badRequest(ctx, "JPG、PNG、WebP形式のみ対応しています")
		}

		src, err := file.Open()
		if err != nil {
			return internalError(ctx, "failed to open file")
		}
		defer src.Close()

		key := fmt.Sprintf("%s/%s%s", subdir, uuid.New().String()[:8], ext)
		url, err := storage.Save(ctx.Request().Context(), key, src)
		if err != nil {
			return internalError(ctx, "failed to save file")
		}

		return ctx.JSON(http.StatusOK, openapi.ModelsUploadUrlResponse{Url: url})
	}
}
