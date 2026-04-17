package controller

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/domain/jobpdf"
	"github.com/akiyama/inselfy/backend/internal/port"
	"github.com/akiyama/inselfy/backend/internal/usecase"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

type JobPdfController struct {
	interactor *usecase.JobPdfInteractor
	presenter  *presenter.JobPdfPresenter
	storage    port.FileStorage
}

func NewJobPdfController(i *usecase.JobPdfInteractor, p *presenter.JobPdfPresenter, s port.FileStorage) *JobPdfController {
	return &JobPdfController{interactor: i, presenter: p, storage: s}
}

// Upload handles POST /api/company/jobs/upload-pdf
func (ctrl *JobPdfController) Upload(c echo.Context) error {
	companyID := c.Get(middleware.ContextKeyCompanyID).(uuid.UUID)
	companyUserID := c.Get(middleware.ContextKeyCompanyUserID).(uuid.UUID)

	file, err := c.FormFile("file")
	if err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{
			Code:    "BAD_REQUEST",
			Message: "file is required",
		})
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext != ".pdf" {
		return c.JSON(http.StatusBadRequest, errorResponse{
			Code:    "BAD_REQUEST",
			Message: "only PDF files are accepted",
		})
	}

	if file.Size > 10*1024*1024 {
		return c.JSON(http.StatusBadRequest, errorResponse{
			Code:    "BAD_REQUEST",
			Message: "file size must be under 10MB",
		})
	}

	src, err := file.Open()
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errorResponse{
			Code:    "INTERNAL_ERROR",
			Message: "failed to read file",
		})
	}
	defer src.Close()

	fileID := uuid.New().String()
	filename := fmt.Sprintf("%s_%s%s", companyID.String(), fileID, ext)
	key := "job-pdfs/" + filename

	_, err = ctrl.storage.Save(c.Request().Context(), key, src)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errorResponse{
			Code:    "INTERNAL_ERROR",
			Message: "failed to save file",
		})
	}

	// Read photo_urls from form field (JSON array of URLs)
	var photoURLs json.RawMessage
	if photoURLsStr := c.FormValue("photo_urls"); photoURLsStr != "" {
		photoURLs = json.RawMessage(photoURLsStr)
	}

	// Read optional job_posting_id
	var jobPostingID *uuid.UUID
	if jpID := c.FormValue("job_posting_id"); jpID != "" {
		if parsed, err := uuid.Parse(jpID); err == nil {
			jobPostingID = &parsed
		}
	}

	u := &jobpdf.Upload{
		CompanyID:        companyID,
		CompanyUserID:    companyUserID,
		JobPostingID:     jobPostingID,
		FilePath:         key,
		OriginalFilename: file.Filename,
		PhotoURLs:        photoURLs,
	}

	created, err := ctrl.interactor.Upload(c.Request().Context(), u)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(http.StatusCreated, ctrl.presenter.ToResponse(created))
}

// ListByCompany handles GET /api/company/jobs/pdf-uploads
func (ctrl *JobPdfController) ListByCompany(c echo.Context) error {
	companyID := c.Get(middleware.ContextKeyCompanyID).(uuid.UUID)

	uploads, err := ctrl.interactor.ListByCompanyID(c.Request().Context(), companyID)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"uploads": ctrl.presenter.ToCompanyListResponse(uploads),
	})
}

// GetDraftByCompany handles GET /api/company/jobs/pdf-uploads/:uploadId/draft
func (ctrl *JobPdfController) GetDraftByCompany(c echo.Context) error {
	companyID := c.Get(middleware.ContextKeyCompanyID).(uuid.UUID)
	id, err := uuid.Parse(c.Param("uploadId"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{Code: "BAD_REQUEST", Message: "invalid upload ID"})
	}

	u, err := ctrl.interactor.GetDraft(c.Request().Context(), id)
	if err != nil {
		return handleError(c, err)
	}

	if u.CompanyID != companyID {
		return c.JSON(http.StatusForbidden, errorResponse{Code: "FORBIDDEN", Message: "not your upload"})
	}

	return c.JSON(http.StatusOK, ctrl.presenter.ToDraftResponse(u))
}

// ApplyDraftByCompany handles POST /api/company/jobs/pdf-uploads/:uploadId/apply-draft
func (ctrl *JobPdfController) ApplyDraftByCompany(c echo.Context) error {
	companyID := c.Get(middleware.ContextKeyCompanyID).(uuid.UUID)
	id, err := uuid.Parse(c.Param("uploadId"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{Code: "BAD_REQUEST", Message: "invalid upload ID"})
	}

	// Verify ownership first
	upload, err := ctrl.interactor.GetByID(c.Request().Context(), id)
	if err != nil {
		return handleError(c, err)
	}
	if upload.CompanyID != companyID {
		return c.JSON(http.StatusForbidden, errorResponse{Code: "FORBIDDEN", Message: "not your upload"})
	}

	u, err := ctrl.interactor.ApplyDraft(c.Request().Context(), id)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(http.StatusOK, ctrl.presenter.ToDraftResponse(u))
}

// ListByJobPosting handles GET /api/company/jobs/:jobId/pdf-uploads
func (ctrl *JobPdfController) ListByJobPosting(c echo.Context) error {
	companyID := c.Get(middleware.ContextKeyCompanyID).(uuid.UUID)
	jobID, err := uuid.Parse(c.Param("jobId"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{Code: "BAD_REQUEST", Message: "invalid job ID"})
	}

	uploads, err := ctrl.interactor.ListByJobPostingID(c.Request().Context(), jobID)
	if err != nil {
		return handleError(c, err)
	}

	// Filter to ensure company ownership
	var filtered []*jobpdf.Upload
	for _, u := range uploads {
		if u.CompanyID == companyID {
			filtered = append(filtered, u)
		}
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"uploads": ctrl.presenter.ToCompanyListResponse(filtered),
	})
}

// DeleteByCompany handles DELETE /api/company/jobs/pdf-uploads/:uploadId
func (ctrl *JobPdfController) DeleteByCompany(c echo.Context) error {
	companyID := c.Get(middleware.ContextKeyCompanyID).(uuid.UUID)
	id, err := uuid.Parse(c.Param("uploadId"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{Code: "BAD_REQUEST", Message: "invalid upload ID"})
	}

	u, err := ctrl.interactor.GetByID(c.Request().Context(), id)
	if err != nil {
		return handleError(c, err)
	}

	if u.CompanyID != companyID {
		return c.JSON(http.StatusForbidden, errorResponse{Code: "FORBIDDEN", Message: "not your upload"})
	}

	if u.Status != "pending" {
		return c.JSON(http.StatusBadRequest, errorResponse{Code: "BAD_REQUEST", Message: "処理が開始されたPDFは削除できません"})
	}

	filePath, err := ctrl.interactor.Delete(c.Request().Context(), id)
	if err != nil {
		return handleError(c, err)
	}

	if filePath != "" {
		ctrl.storage.Delete(c.Request().Context(), filePath)
	}

	return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
}

// AdminList handles GET /api/admin/job-pdfs?status=pending
func (ctrl *JobPdfController) AdminList(c echo.Context) error {
	status := c.QueryParam("status")

	uploads, err := ctrl.interactor.ListAll(c.Request().Context(), status)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"uploads": ctrl.presenter.ToAdminListResponse(uploads),
	})
}

// AdminGetByID handles GET /api/admin/job-pdfs/:uploadId
func (ctrl *JobPdfController) AdminGetByID(c echo.Context) error {
	id, err := uuid.Parse(c.Param("uploadId"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{Code: "BAD_REQUEST", Message: "invalid upload ID"})
	}

	u, err := ctrl.interactor.GetByID(c.Request().Context(), id)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(http.StatusOK, ctrl.presenter.ToAdminResponse(u))
}

// AdminDownload handles GET /api/admin/job-pdfs/:uploadId/download
func (ctrl *JobPdfController) AdminDownload(c echo.Context) error {
	id, err := uuid.Parse(c.Param("uploadId"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{Code: "BAD_REQUEST", Message: "invalid upload ID"})
	}

	u, err := ctrl.interactor.GetByID(c.Request().Context(), id)
	if err != nil {
		return handleError(c, err)
	}

	rc, err := ctrl.storage.Open(c.Request().Context(), u.FilePath)
	if err != nil {
		return c.JSON(http.StatusNotFound, errorResponse{Code: "NOT_FOUND", Message: "file not found"})
	}
	defer rc.Close()

	c.Response().Header().Set("Content-Disposition", fmt.Sprintf(`inline; filename="%s"`, u.OriginalFilename))
	return c.Stream(http.StatusOK, "application/pdf", rc)
}

// AdminSaveDraftByJobPosting handles PUT /api/admin/job-postings/:jobPostingId/job-pdf-draft
func (ctrl *JobPdfController) AdminSaveDraftByJobPosting(c echo.Context) error {
	jobPostingID, err := uuid.Parse(c.Param("jobPostingId"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{Code: "BAD_REQUEST", Message: "invalid job posting ID"})
	}

	body, err := io.ReadAll(c.Request().Body)
	if err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{Code: "BAD_REQUEST", Message: "failed to read request body"})
	}

	if err := ctrl.interactor.SaveDraftByJobPostingID(c.Request().Context(), jobPostingID, json.RawMessage(body)); err != nil {
		return handleError(c, err)
	}

	return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
}

// AdminGetDraft handles GET /api/admin/job-pdfs/:uploadId/draft
func (ctrl *JobPdfController) AdminGetDraft(c echo.Context) error {
	id, err := uuid.Parse(c.Param("uploadId"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{Code: "BAD_REQUEST", Message: "invalid upload ID"})
	}

	u, err := ctrl.interactor.GetDraft(c.Request().Context(), id)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(http.StatusOK, ctrl.presenter.ToDraftResponse(u))
}

// AdminGetPrompt handles GET /api/admin/job-pdfs/:uploadId/prompt
func (ctrl *JobPdfController) AdminGetPrompt(c echo.Context) error {
	id, err := uuid.Parse(c.Param("uploadId"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{Code: "BAD_REQUEST", Message: "invalid upload ID"})
	}

	prompt, err := ctrl.interactor.GetPrompt(c.Request().Context(), id)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(http.StatusOK, map[string]string{"prompt": prompt})
}

// AdminDelete handles DELETE /api/admin/job-pdfs/:uploadId
func (ctrl *JobPdfController) AdminDelete(c echo.Context) error {
	id, err := uuid.Parse(c.Param("uploadId"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{Code: "BAD_REQUEST", Message: "invalid upload ID"})
	}

	filePath, err := ctrl.interactor.Delete(c.Request().Context(), id)
	if err != nil {
		return handleError(c, err)
	}

	if filePath != "" {
		ctrl.storage.Delete(c.Request().Context(), filePath)
	}

	return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
}
