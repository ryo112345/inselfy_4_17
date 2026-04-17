package controller

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	domainerrors "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/resume"
	"github.com/akiyama/inselfy/backend/internal/port"
	"github.com/akiyama/inselfy/backend/internal/usecase"
	"github.com/google/uuid"
	"github.com/labstack/echo/v4"
)

type ResumeController struct {
	interactor *usecase.ResumeInteractor
	presenter  *presenter.ResumePresenter
	storage    port.FileStorage
}

func NewResumeController(i *usecase.ResumeInteractor, p *presenter.ResumePresenter, s port.FileStorage) *ResumeController {
	return &ResumeController{interactor: i, presenter: p, storage: s}
}

func (ctrl *ResumeController) getUserID(c echo.Context) (uuid.UUID, error) {
	token := getAuthToken(c)
	if token == "" {
		return uuid.Nil, echo.NewHTTPError(http.StatusUnauthorized, "not logged in")
	}
	userID := strings.TrimPrefix(token, "mock_token_")
	if userID == token {
		return uuid.Nil, echo.NewHTTPError(http.StatusUnauthorized, "invalid token")
	}
	id, err := uuid.Parse(userID)
	if err != nil {
		return uuid.Nil, echo.NewHTTPError(http.StatusUnauthorized, "invalid token")
	}
	return id, nil
}

// Upload handles POST /api/users/me/resume
func (ctrl *ResumeController) Upload(c echo.Context) error {
	userID, err := ctrl.getUserID(c)
	if err != nil {
		return err
	}

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
	filename := fmt.Sprintf("%s_%s%s", userID.String(), fileID, ext)
	key := "resumes/" + filename

	_, err = ctrl.storage.Save(c.Request().Context(), key, src)
	if err != nil {
		return c.JSON(http.StatusInternalServerError, errorResponse{
			Code:    "INTERNAL_ERROR",
			Message: "failed to save file",
		})
	}

	u := &resume.Upload{
		UserID:           userID,
		FilePath:         key,
		OriginalFilename: file.Filename,
	}

	created, err := ctrl.interactor.Upload(c.Request().Context(), u)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(http.StatusCreated, ctrl.presenter.ToResponse(created))
}

// GetMyStatus handles GET /api/users/me/resume/status
func (ctrl *ResumeController) GetMyStatus(c echo.Context) error {
	userID, err := ctrl.getUserID(c)
	if err != nil {
		return err
	}

	u, err := ctrl.interactor.GetByUserID(c.Request().Context(), userID)
	if err != nil {
		if errors.Is(err, domainerrors.ErrNotFound) {
			return c.JSON(http.StatusOK, map[string]interface{}{"status": nil})
		}
		return handleError(c, err)
	}

	return c.JSON(http.StatusOK, ctrl.presenter.ToResponse(u))
}

// AdminList handles GET /api/admin/resumes?status=pending
func (ctrl *ResumeController) AdminList(c echo.Context) error {
	status := c.QueryParam("status")

	uploads, err := ctrl.interactor.ListAll(c.Request().Context(), status)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"uploads": ctrl.presenter.ToAdminListResponse(uploads),
	})
}

// AdminGetByID handles GET /api/admin/resumes/:resumeId
func (ctrl *ResumeController) AdminGetByID(c echo.Context) error {
	id, err := uuid.Parse(c.Param("resumeId"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{
			Code:    "BAD_REQUEST",
			Message: "invalid resume ID",
		})
	}

	u, err := ctrl.interactor.GetByID(c.Request().Context(), id)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(http.StatusOK, ctrl.presenter.ToAdminResponse(u))
}

type updateStatusRequest struct {
	Status string `json:"status"`
}

// AdminDownload handles GET /api/admin/resumes/:resumeId/download
func (ctrl *ResumeController) AdminDownload(c echo.Context) error {
	id, err := uuid.Parse(c.Param("resumeId"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{
			Code:    "BAD_REQUEST",
			Message: "invalid resume ID",
		})
	}

	u, err := ctrl.interactor.GetByID(c.Request().Context(), id)
	if err != nil {
		return handleError(c, err)
	}

	rc, err := ctrl.storage.Open(c.Request().Context(), u.FilePath)
	if err != nil {
		return c.JSON(http.StatusNotFound, errorResponse{
			Code:    "NOT_FOUND",
			Message: "file not found",
		})
	}
	defer rc.Close()

	c.Response().Header().Set("Content-Disposition", fmt.Sprintf(`inline; filename="%s"`, u.OriginalFilename))
	return c.Stream(http.StatusOK, "application/pdf", rc)
}

// AdminUpdateStatus handles PATCH /api/admin/resumes/:resumeId/status
func (ctrl *ResumeController) AdminUpdateStatus(c echo.Context) error {
	id, err := uuid.Parse(c.Param("resumeId"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{
			Code:    "BAD_REQUEST",
			Message: "invalid resume ID",
		})
	}

	var req updateStatusRequest
	if err := c.Bind(&req); err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{
			Code:    "BAD_REQUEST",
			Message: "invalid request body",
		})
	}

	if err := ctrl.interactor.UpdateStatus(c.Request().Context(), id, req.Status); err != nil {
		return handleError(c, err)
	}

	return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
}

// AdminSaveDraft handles PUT /api/admin/resumes/:resumeId/draft
func (ctrl *ResumeController) AdminSaveDraft(c echo.Context) error {
	id, err := uuid.Parse(c.Param("resumeId"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{
			Code:    "BAD_REQUEST",
			Message: "invalid resume ID",
		})
	}

	body, err := io.ReadAll(c.Request().Body)
	if err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{
			Code:    "BAD_REQUEST",
			Message: "failed to read request body",
		})
	}

	if err := ctrl.interactor.SaveDraft(c.Request().Context(), id, json.RawMessage(body)); err != nil {
		return handleError(c, err)
	}

	return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
}

// AdminGetDraft handles GET /api/admin/resumes/:resumeId/draft
func (ctrl *ResumeController) AdminGetDraft(c echo.Context) error {
	id, err := uuid.Parse(c.Param("resumeId"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{
			Code:    "BAD_REQUEST",
			Message: "invalid resume ID",
		})
	}

	u, err := ctrl.interactor.GetDraft(c.Request().Context(), id)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(http.StatusOK, ctrl.presenter.ToDraftResponse(u))
}

// AdminGetDraftByUsername handles GET /api/admin/resumes/by-username/:username/draft
func (ctrl *ResumeController) AdminGetDraftByUsername(c echo.Context) error {
	username := c.Param("username")

	u, err := ctrl.interactor.GetDraftByUsername(c.Request().Context(), username)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(http.StatusOK, ctrl.presenter.ToDraftResponse(u))
}

// AdminListApprovals handles GET /api/admin/resumes/:resumeId/approvals
func (ctrl *ResumeController) AdminListApprovals(c echo.Context) error {
	id, err := uuid.Parse(c.Param("resumeId"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{
			Code:    "BAD_REQUEST",
			Message: "invalid resume ID",
		})
	}

	approvals, err := ctrl.interactor.ListApprovals(c.Request().Context(), id)
	if err != nil {
		return handleError(c, err)
	}

	return c.JSON(http.StatusOK, map[string]interface{}{
		"approvals": ctrl.presenter.ToApprovalListResponse(approvals),
	})
}

// AdminApproveDraft handles POST /api/admin/resumes/:resumeId/draft/approve
func (ctrl *ResumeController) AdminApproveDraft(c echo.Context) error {
	id, err := uuid.Parse(c.Param("resumeId"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{
			Code:    "BAD_REQUEST",
			Message: "invalid resume ID",
		})
	}

	adminID := c.Get(middleware.ContextKeyAdminID).(uuid.UUID)

	if err := ctrl.interactor.ApproveDraft(c.Request().Context(), id, adminID); err != nil {
		return handleError(c, err)
	}

	return c.JSON(http.StatusOK, map[string]string{"status": "ok"})
}

// AdminDelete handles DELETE /api/admin/resumes/:resumeId
func (ctrl *ResumeController) AdminDelete(c echo.Context) error {
	id, err := uuid.Parse(c.Param("resumeId"))
	if err != nil {
		return c.JSON(http.StatusBadRequest, errorResponse{
			Code:    "BAD_REQUEST",
			Message: "invalid resume ID",
		})
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
