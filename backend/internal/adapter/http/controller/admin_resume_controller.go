package controller

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	domainresume "github.com/akiyama/inselfy/backend/internal/domain/resume"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// AdminResumeController handles the admin resume-processing endpoints.
// Reads are pool-backed (admin controller exception, CLAUDE.md); Approve
// delegates to the ResumeInputPort because it rewrites the candidate profile
// through the port repositories inside one transaction.
type AdminResumeController struct {
	queries *generated.Queries
	storage port.FileStorage
	input   port.ResumeInputPort
}

// NewAdminResumeController creates an AdminResumeController. storage must be
// the private storage instance the candidate upload used.
func NewAdminResumeController(pool *pgxpool.Pool, storage port.FileStorage, input port.ResumeInputPort) *AdminResumeController {
	return &AdminResumeController{queries: generated.New(pool), storage: storage, input: input}
}

// List handles GET /api/admin/resumes.
func (c *AdminResumeController) List(ctx context.Context, req openapi.AdminListResumesRequestObject) (openapi.AdminListResumesResponseObject, error) {
	var items []openapi.ModelsAdminResumeItem
	if req.Params.Status != nil {
		rows, err := c.queries.ListResumeUploadsByStatus(ctx, generated.ResumeUploadStatus(*req.Params.Status))
		if err != nil {
			return nil, err
		}
		items = make([]openapi.ModelsAdminResumeItem, 0, len(rows))
		for _, r := range rows {
			items = append(items, adminResumeItem(&r.ResumeUpload, r.UserName, r.Username))
		}
	} else {
		rows, err := c.queries.ListResumeUploads(ctx)
		if err != nil {
			return nil, err
		}
		items = make([]openapi.ModelsAdminResumeItem, 0, len(rows))
		for _, r := range rows {
			items = append(items, adminResumeItem(&r.ResumeUpload, r.UserName, r.Username))
		}
	}
	return openapi.AdminListResumes200JSONResponse(openapi.ModelsAdminResumeListResponse{Uploads: items}), nil
}

// Download handles GET /api/admin/resumes/{resumeId}/download.
func (c *AdminResumeController) Download(ctx context.Context, req openapi.AdminDownloadResumeRequestObject) (openapi.AdminDownloadResumeResponseObject, error) {
	row, err := c.queries.GetResumeUploadByID(ctx, pgUUID(req.ResumeId))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return openapi.AdminDownloadResume404JSONResponse(notFoundBody(errors.New("resume not found"))), nil
		}
		return nil, err
	}
	f, err := c.storage.Open(ctx, row.StorageKey)
	if err != nil {
		return openapi.AdminDownloadResume404JSONResponse(notFoundBody(errors.New("resume file not found"))), nil
	}
	defer func() { _ = f.Close() }()
	// アップロード上限（maxUploadBytes）以下なのでメモリ読みで十分。
	data, err := io.ReadAll(io.LimitReader(f, maxUploadBytes+1))
	if err != nil {
		return nil, err
	}
	return openapi.AdminDownloadResume200ApplicationpdfResponse{
		Body:          bytes.NewReader(data),
		ContentLength: int64(len(data)),
	}, nil
}

// GetDraft handles GET /api/admin/resumes/{resumeId}/draft.
func (c *AdminResumeController) GetDraft(ctx context.Context, req openapi.AdminGetResumeDraftRequestObject) (openapi.AdminGetResumeDraftResponseObject, error) {
	row, err := c.queries.GetResumeUploadWithUserByID(ctx, pgUUID(req.ResumeId))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return openapi.AdminGetResumeDraft404JSONResponse(notFoundBody(errors.New("resume not found"))), nil
		}
		return nil, err
	}
	var draft any
	if len(row.ResumeUpload.Draft) > 0 {
		draft = json.RawMessage(row.ResumeUpload.Draft)
	}
	return openapi.AdminGetResumeDraft200JSONResponse(openapi.ModelsAdminResumeDraftResponse{
		Upload: adminResumeItem(&row.ResumeUpload, row.UserName, row.Username),
		Draft:  draft,
	}), nil
}

// SaveDraftHTTP handles PUT /api/admin/resumes/{resumeId}/draft.
//
// 例外的に strict wrapper を経由しない手書きハンドラ（UpdateProfileHTTP と
// 同じ 3-3 パターン）。CLAUDE.md のワークフロー契約では `json: unknown field`
// や `cannot unmarshal ... int16` をそのまま message で返す必要があり、
// strict の事前デコード（interface{}）では DisallowUnknownFields を効かせ
// られないため raw body を domain の ParseDraft に渡す。
func (c *AdminResumeController) SaveDraftHTTP(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(http.MaxBytesReader(w, r.Body, maxUploadBytes))
	if err != nil {
		writeJSON(w, http.StatusBadRequest, badRequestBody("invalid body"))
		return
	}
	if _, err := domainresume.ParseDraft(body); err != nil {
		writeJSON(w, http.StatusBadRequest, badRequestBody(err.Error()))
		return
	}
	row, err := c.queries.UpdateResumeUploadDraft(r.Context(), &generated.UpdateResumeUploadDraftParams{
		ID:    pgUUID(r.PathValue("resumeId")),
		Draft: body,
	})
	if err != nil {
		if !errors.Is(err, pgx.ErrNoRows) {
			writeError(w, err)
			return
		}
		// 条件付き UPDATE が空振り: 存在しない(404) か終端ステータス(409)。
		if _, err := c.queries.GetResumeUploadByID(r.Context(), pgUUID(r.PathValue("resumeId"))); err != nil {
			writeJSON(w, http.StatusNotFound, notFoundBody(errors.New("resume not found")))
			return
		}
		writeJSON(w, http.StatusConflict, conflictBody(errors.New("承認/却下済みの職務経歴書は編集できません")))
		return
	}
	writeJSON(w, http.StatusOK, openapi.ModelsAdminResumeDraftSaveResponse{
		Message: "draft saved",
		Status:  openapi.ModelsResumeUploadStatus(row.Status),
	})
}

// Approve handles POST /api/admin/resumes/{resumeId}/approve.
func (c *AdminResumeController) Approve(ctx context.Context, req openapi.AdminApproveResumeRequestObject) (openapi.AdminApproveResumeResponseObject, error) {
	up, err := c.input.Approve(ctx, req.ResumeId, authmw.AdminIDFromContext(ctx))
	if err != nil {
		if errors.Is(err, domainresume.ErrNotReviewing) {
			return openapi.AdminApproveResume409JSONResponse(conflictBody(errors.New("ドラフト未保存、または既に承認/却下済みです"))), nil
		}
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.AdminApproveResume404JSONResponse(notFoundBody(errors.New("resume not found"))), nil
		case http.StatusBadRequest:
			return openapi.AdminApproveResume400JSONResponse(badRequestBody(err.Error())), nil
		default:
			return nil, err
		}
	}
	// 一覧 JOIN 相当のユーザー名を補完（承認直後の表示用）。
	row, err := c.queries.GetResumeUploadWithUserByID(ctx, pgUUID(up.ID))
	if err != nil {
		return nil, err
	}
	return openapi.AdminApproveResume200JSONResponse(adminResumeItem(&row.ResumeUpload, row.UserName, row.Username)), nil
}

// Reject handles POST /api/admin/resumes/{resumeId}/reject.
func (c *AdminResumeController) Reject(ctx context.Context, req openapi.AdminRejectResumeRequestObject) (openapi.AdminRejectResumeResponseObject, error) {
	row, err := c.queries.RejectResumeUpload(ctx, pgUUID(req.ResumeId))
	if err != nil {
		if !errors.Is(err, pgx.ErrNoRows) {
			return nil, err
		}
		if _, getErr := c.queries.GetResumeUploadByID(ctx, pgUUID(req.ResumeId)); getErr != nil {
			//nolint:nilerr // 対象不在は固定メッセージの 404
			return openapi.AdminRejectResume404JSONResponse(notFoundBody(errors.New("resume not found"))), nil
		}
		return openapi.AdminRejectResume409JSONResponse(conflictBody(errors.New("既に承認/却下済みです"))), nil
	}
	with, err := c.queries.GetResumeUploadWithUserByID(ctx, row.ID)
	if err != nil {
		return nil, err
	}
	return openapi.AdminRejectResume200JSONResponse(adminResumeItem(&with.ResumeUpload, with.UserName, with.Username)), nil
}

func adminResumeItem(row *generated.ResumeUpload, userName, username string) openapi.ModelsAdminResumeItem {
	return openapi.ModelsAdminResumeItem{
		Id:               pgUUIDToString(row.ID),
		UserId:           pgUUIDToString(row.UserID),
		UserName:         userName,
		Username:         username,
		OriginalFilename: row.OriginalFilename,
		Status:           openapi.ModelsResumeUploadStatus(row.Status),
		CreatedAt:        row.CreatedAt.Time,
		UpdatedAt:        row.UpdatedAt.Time,
	}
}
