package controller

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"strconv"
	"strings"

	"github.com/google/uuid"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/domain/jobposting"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// JobPostingController handles job posting CRUD HTTP endpoints.
type JobPostingController struct {
	input       port.JobPostingInputPort
	fileStorage port.FileStorage
}

// NewJobPostingController creates a JobPostingController.
func NewJobPostingController(
	input port.JobPostingInputPort,
	fileStorage port.FileStorage,
) *JobPostingController {
	return &JobPostingController{input: input, fileStorage: fileStorage}
}

// Create handles POST /api/company/jobs.
func (c *JobPostingController) Create(ctx context.Context, req openapi.CompanyJobPostingsCreateJobPostingRequestObject) (openapi.CompanyJobPostingsCreateJobPostingResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)
	if req.Body == nil {
		return openapi.CompanyJobPostingsCreateJobPosting400JSONResponse(badRequestBody("invalid request body")), nil
	}

	in := jobPostingReqConv.ToCreateInput(*req.Body)
	in.CompanyID = companyID

	j, err := c.input.Create(ctx, in)
	if err != nil {
		if errorStatus(err) == http.StatusBadRequest {
			return openapi.CompanyJobPostingsCreateJobPosting400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CompanyJobPostingsCreateJobPosting201JSONResponse(*presenter.JobPostingResponse(j)), nil
}

// List handles GET /api/company/jobs.
func (c *JobPostingController) List(ctx context.Context, _ openapi.CompanyJobPostingsListCompanyJobPostingsRequestObject) (openapi.CompanyJobPostingsListCompanyJobPostingsResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)

	js, err := c.input.List(ctx, companyID)
	if err != nil {
		if errorStatus(err) == http.StatusBadRequest {
			return openapi.CompanyJobPostingsListCompanyJobPostings400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CompanyJobPostingsListCompanyJobPostings200JSONResponse(*presenter.JobPostingsPaginatedResponse(js, len(js))), nil
}

// Get handles GET /api/company/jobs/{jobId}.
func (c *JobPostingController) Get(ctx context.Context, req openapi.CompanyJobPostingsGetCompanyJobPostingRequestObject) (openapi.CompanyJobPostingsGetCompanyJobPostingResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)

	j, err := c.input.Get(ctx, companyID, req.JobId)
	if err != nil {
		switch errorStatus(err) {
		case http.StatusForbidden:
			return openapi.CompanyJobPostingsGetCompanyJobPosting403JSONResponse(forbiddenBody(err)), nil
		case http.StatusNotFound:
			return openapi.CompanyJobPostingsGetCompanyJobPosting404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CompanyJobPostingsGetCompanyJobPosting400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CompanyJobPostingsGetCompanyJobPosting200JSONResponse(*presenter.JobPostingResponse(j)), nil
}

// ListPublic handles GET /api/jobs (no auth).
func (c *JobPostingController) ListPublic(ctx context.Context, req openapi.PublicJobPostingsListPublicJobPostingsRequestObject) (openapi.PublicJobPostingsListPublicJobPostingsResponseObject, error) {
	limit := derefInt32(req.Params.Limit)

	if limit > 0 {
		var params jobposting.SearchPublicParams
		params.Limit = limit
		params.Offset = derefInt32(req.Params.Offset)
		if s := derefString(req.Params.Search); s != "" {
			params.Search = &s
		}
		if v := derefString(req.Params.Category); v != "" {
			params.JobCategory = &v
		}
		if v := derefString(req.Params.EmploymentType); v != "" {
			params.EmploymentType = &v
		}
		if v := derefString(req.Params.RemotePolicy); v != "" {
			params.RemotePolicy = &v
		}
		params.SortBySalary = req.Params.Sort != nil && *req.Params.Sort == openapi.ModelsJobPostingSortSalary

		if vf := derefString(req.Params.ValueFilters); vf != "" {
			params.FilterMode = "values"
			if req.Params.FilterMode != nil {
				params.FilterMode = string(*req.Params.FilterMode)
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

		js, total, err := c.input.SearchPublic(ctx, params)
		if err != nil {
			if errorStatus(err) == http.StatusBadRequest {
				return openapi.PublicJobPostingsListPublicJobPostings400JSONResponse(badRequestBody(err.Error())), nil
			}
			return nil, err
		}
		return openapi.PublicJobPostingsListPublicJobPostings200JSONResponse(*presenter.JobPostingsPaginatedResponse(js, total)), nil
	}

	js, err := c.input.ListPublic(ctx)
	if err != nil {
		if errorStatus(err) == http.StatusBadRequest {
			return openapi.PublicJobPostingsListPublicJobPostings400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.PublicJobPostingsListPublicJobPostings200JSONResponse(*presenter.JobPostingsPaginatedResponse(js, len(js))), nil
}

// GetPublic handles GET /api/jobs/{jobId} (no auth).
func (c *JobPostingController) GetPublic(ctx context.Context, req openapi.PublicJobPostingsGetPublicJobPostingRequestObject) (openapi.PublicJobPostingsGetPublicJobPostingResponseObject, error) {
	j, err := c.input.GetPublic(ctx, req.JobId)
	if err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.PublicJobPostingsGetPublicJobPosting404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.PublicJobPostingsGetPublicJobPosting400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.PublicJobPostingsGetPublicJobPosting200JSONResponse(*presenter.JobPostingResponse(j)), nil
}

// Update handles PUT /api/company/jobs/{jobId}.
func (c *JobPostingController) Update(ctx context.Context, req openapi.CompanyJobPostingsUpdateJobPostingRequestObject) (openapi.CompanyJobPostingsUpdateJobPostingResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)
	if req.Body == nil {
		return openapi.CompanyJobPostingsUpdateJobPosting400JSONResponse(badRequestBody("invalid request body")), nil
	}

	j, err := c.input.Update(ctx, companyID, req.JobId, jobPostingReqConv.ToUpdateInput(*req.Body))
	if err != nil {
		switch errorStatus(err) {
		case http.StatusForbidden:
			return openapi.CompanyJobPostingsUpdateJobPosting403JSONResponse(forbiddenBody(err)), nil
		case http.StatusNotFound:
			return openapi.CompanyJobPostingsUpdateJobPosting404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CompanyJobPostingsUpdateJobPosting400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CompanyJobPostingsUpdateJobPosting200JSONResponse(*presenter.JobPostingResponse(j)), nil
}

// Delete handles DELETE /api/company/jobs/{jobId}.
func (c *JobPostingController) Delete(ctx context.Context, req openapi.CompanyJobPostingsDeleteJobPostingRequestObject) (openapi.CompanyJobPostingsDeleteJobPostingResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)

	if err := c.input.Delete(ctx, companyID, req.JobId); err != nil {
		switch errorStatus(err) {
		case http.StatusForbidden:
			return openapi.CompanyJobPostingsDeleteJobPosting403JSONResponse(forbiddenBody(err)), nil
		case http.StatusNotFound:
			return openapi.CompanyJobPostingsDeleteJobPosting404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CompanyJobPostingsDeleteJobPosting400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CompanyJobPostingsDeleteJobPosting204Response{}, nil
}

// jobPostingReqConv is the goverter-generated request→input mapper.
// See job_posting_request_converter.go for its declaration.
var jobPostingReqConv jobPostingRequestConverter = &jobPostingRequestConverterImpl{}

// UploadTeamMemberPhoto handles POST /api/company/jobs/team-member-photo.
func (c *JobPostingController) UploadTeamMemberPhoto(ctx context.Context, req openapi.CompanyJobPostingsUploadTeamMemberPhotoRequestObject) (openapi.CompanyJobPostingsUploadTeamMemberPhotoResponseObject, error) {
	url, errBody, err := c.saveJobImage(ctx, req.Body, "team-member-photos")
	if err != nil {
		return nil, err
	}
	if errBody != nil {
		return openapi.CompanyJobPostingsUploadTeamMemberPhoto400JSONResponse(*errBody), nil
	}
	return openapi.CompanyJobPostingsUploadTeamMemberPhoto200JSONResponse(openapi.ModelsUploadUrlResponse{Url: url}), nil
}

// UploadGalleryImage handles POST /api/company/jobs/gallery-image.
func (c *JobPostingController) UploadGalleryImage(ctx context.Context, req openapi.CompanyJobPostingsUploadGalleryImageRequestObject) (openapi.CompanyJobPostingsUploadGalleryImageResponseObject, error) {
	url, errBody, err := c.saveJobImage(ctx, req.Body, "gallery-images")
	if err != nil {
		return nil, err
	}
	if errBody != nil {
		return openapi.CompanyJobPostingsUploadGalleryImage400JSONResponse(*errBody), nil
	}
	return openapi.CompanyJobPostingsUploadGalleryImage200JSONResponse(openapi.ModelsUploadUrlResponse{Url: url}), nil
}

// UploadCoverImage handles POST /api/company/jobs/cover-image.
func (c *JobPostingController) UploadCoverImage(ctx context.Context, req openapi.CompanyJobPostingsUploadJobCoverImageRequestObject) (openapi.CompanyJobPostingsUploadJobCoverImageResponseObject, error) {
	url, errBody, err := c.saveJobImage(ctx, req.Body, "cover-images")
	if err != nil {
		return nil, err
	}
	if errBody != nil {
		return openapi.CompanyJobPostingsUploadJobCoverImage400JSONResponse(*errBody), nil
	}
	return openapi.CompanyJobPostingsUploadJobCoverImage200JSONResponse(openapi.ModelsUploadUrlResponse{Url: url}), nil
}

// saveJobImage is the strict-server counterpart of the echo-era
// HandleImageUpload: extension whitelist + 5MB cap, saved under subdir with a
// short random name. A non-nil errBody means a 400 the caller wraps in its
// operation-specific response type.
func (c *JobPostingController) saveJobImage(ctx context.Context, r *multipart.Reader, subdir string) (url string, errBody *openapi.ModelsBadRequestError, err error) {
	data, filename, _, err := readFilePart(r)
	if err != nil {
		switch {
		case errors.Is(err, errFilePartMissing):
			b := badRequestBody("file is required")
			return "", &b, nil
		case errors.Is(err, errFilePartTooLarge):
			b := badRequestBody("ファイルサイズは5MB以下にしてください")
			return "", &b, nil
		}
		return "", nil, err
	}

	ext := strings.ToLower(filepath.Ext(filename))
	if ext != ".jpg" && ext != ".jpeg" && ext != ".png" && ext != ".webp" {
		b := badRequestBody("JPG、PNG、WebP形式のみ対応しています")
		return "", &b, nil
	}

	key := fmt.Sprintf("%s/%s%s", subdir, uuid.New().String()[:8], ext)
	url, err = c.fileStorage.Save(ctx, key, bytes.NewReader(data))
	if err != nil {
		return "", nil, fmt.Errorf("failed to save file: %w", err)
	}
	return url, nil, nil
}
