package controller

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"net/http"
	"path/filepath"
	"strings"

	"github.com/google/uuid"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/domain/resume"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// ResumeController handles the candidate-facing resume-upload endpoints.
// PDFs go to privateStorage: keys under resumes/ are NOT served by the public
// /api/uploads static route; admins fetch them via the authenticated
// download endpoint (AdminResumeController).
type ResumeController struct {
	input   port.ResumeInputPort
	storage port.FileStorage
}

// NewResumeController creates a ResumeController.
func NewResumeController(input port.ResumeInputPort, storage port.FileStorage) *ResumeController {
	return &ResumeController{input: input, storage: storage}
}

// Upload handles POST /api/resumes.
func (c *ResumeController) Upload(ctx context.Context, req openapi.ResumesUploadResumeRequestObject) (openapi.ResumesUploadResumeResponseObject, error) {
	userID := authmw.UserIDFromContext(ctx)

	data, filename, contentType, err := readFilePart(req.Body)
	switch {
	case errors.Is(err, errFilePartMissing):
		return openapi.ResumesUploadResume400JSONResponse(badRequestBody("file is required")), nil
	case errors.Is(err, errFilePartTooLarge):
		return openapi.ResumesUploadResume400JSONResponse(badRequestBody("ファイルサイズは5MB以下にしてください")), nil
	case err != nil:
		return nil, err
	}

	if strings.ToLower(filepath.Ext(filename)) != ".pdf" ||
		(contentType != "" && contentType != "application/pdf") {
		return openapi.ResumesUploadResume400JSONResponse(badRequestBody("PDF形式のみ対応しています")), nil
	}

	key := fmt.Sprintf("resumes/%s.pdf", uuid.New().String())
	if _, err := c.storage.Save(ctx, key, bytes.NewReader(data)); err != nil {
		return nil, errors.New("failed to save file")
	}

	up, err := c.input.CreateUpload(ctx, userID, filename, key)
	if err != nil {
		// DB 側が拒否したら孤児ファイルを残さない（失敗は無視してよい）。
		_ = c.storage.Delete(ctx, key)
		switch errorStatus(err) {
		case http.StatusConflict:
			return openapi.ResumesUploadResume409JSONResponse(conflictBody(errors.New("既に処理中の職務経歴書があります"))), nil
		case http.StatusBadRequest:
			return openapi.ResumesUploadResume400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	return openapi.ResumesUploadResume201JSONResponse(toResumeUploadItem(up)), nil
}

// GetMine handles GET /api/resumes/me.
func (c *ResumeController) GetMine(ctx context.Context, req openapi.ResumesGetMyResumeRequestObject) (openapi.ResumesGetMyResumeResponseObject, error) {
	up, err := c.input.GetMine(ctx, authmw.UserIDFromContext(ctx))
	if err != nil {
		if errorStatus(err) == http.StatusNotFound {
			return openapi.ResumesGetMyResume200JSONResponse(openapi.ModelsResumeMineResponse{Upload: nil}), nil
		}
		return nil, err
	}
	item := toResumeUploadItem(up)
	return openapi.ResumesGetMyResume200JSONResponse(openapi.ModelsResumeMineResponse{Upload: &item}), nil
}

func toResumeUploadItem(up *resume.Upload) openapi.ModelsResumeUploadItem {
	return openapi.ModelsResumeUploadItem{
		Id:               up.ID,
		OriginalFilename: up.OriginalFilename,
		Status:           openapi.ModelsResumeUploadStatus(up.Status),
		CreatedAt:        up.CreatedAt,
	}
}
