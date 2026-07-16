package controller

import (
	"context"
	"encoding/json"
	"errors"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
)

type AdminCIReportController struct {
	queries *generated.Queries
}

func NewAdminCIReportController(pool *pgxpool.Pool) *AdminCIReportController {
	return &AdminCIReportController{queries: generated.New(pool)}
}

// ListPending handles GET /api/admin/ci-reports/pending.
func (c *AdminCIReportController) ListPending(ctx context.Context, _ openapi.AdminListPendingCiSessionsRequestObject) (openapi.AdminListPendingCiSessionsResponseObject, error) {
	rows, err := c.queries.ListCISessionsWithoutReport(ctx)
	if err != nil {
		return nil, err
	}

	items := make([]openapi.ModelsAdminPendingSessionItem, 0, len(rows))
	for _, r := range rows {
		item := openapi.ModelsAdminPendingSessionItem{
			SessionId: pgUUIDToString(r.SessionID),
			UserId:    pgUUIDToString(r.UserID),
			Username:  r.Username,
			Name:      r.Name,
		}
		if r.CompletedAt.Valid {
			t := r.CompletedAt.Time
			item.CompletedAt = &t
		}
		if r.ReportRequestedAt.Valid {
			t := r.ReportRequestedAt.Time
			item.ReportRequestedAt = &t
		}
		items = append(items, item)
	}

	return openapi.AdminListPendingCiSessions200JSONResponse(openapi.ModelsAdminPendingSessionsResponse{
		Sessions: items,
		Total:    int32(len(items)), //nolint:gosec // 件数が int32 を超えることはない
	}), nil
}

// SaveReport handles PUT /api/admin/ci-sessions/{sessionId}/ai-report.
func (c *AdminCIReportController) SaveReport(ctx context.Context, req openapi.AdminSaveCiReportRequestObject) (openapi.AdminSaveCiReportResponseObject, error) {
	if req.Body == nil {
		return openapi.AdminSaveCiReport400JSONResponse(badRequestBody("invalid body")), nil
	}
	if req.Body.Content == "" {
		return openapi.AdminSaveCiReport400JSONResponse(badRequestBody("content is required")), nil
	}

	pgSessionID := pgUUID(req.SessionId)

	session, err := c.queries.GetCISessionByID(ctx, pgSessionID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return openapi.AdminSaveCiReport404JSONResponse(openapi.ModelsNotFoundError{
				Code:    openapi.ModelsNotFoundErrorCodeNOTFOUND,
				Message: "session not found",
			}), nil
		}
		return nil, err
	}

	report, err := c.queries.UpsertCIAIReport(ctx, &generated.UpsertCIAIReportParams{
		SessionID: pgSessionID,
		UserID:    session.UserID,
		Content:   req.Body.Content,
	})
	if err != nil {
		return nil, err
	}

	return openapi.AdminSaveCiReport200JSONResponse(openapi.ModelsAdminSavedAiReportResponse{
		Id:        pgUUIDToString(report.ID),
		SessionId: pgUUIDToString(report.SessionID),
		Content:   report.Content,
		CreatedAt: report.CreatedAt.Time,
	}), nil
}

// getCIReport is the shared body of the admin and user-facing CI report GETs.
func (c *AdminCIReportController) getCIReport(ctx context.Context, sessionID string) (*openapi.ModelsAiReportResponse, bool, error) {
	pgSessionID := pgUUID(sessionID)
	report, err := c.queries.GetCIAIReportBySessionID(ctx, pgSessionID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, false, nil
		}
		return nil, false, err
	}

	firstView := !report.ViewedAt.Valid
	if firstView {
		_ = c.queries.MarkCIAIReportViewed(ctx, pgSessionID)
	}

	return &openapi.ModelsAiReportResponse{
		Id:        pgUUIDToString(report.ID),
		SessionId: pgUUIDToString(report.SessionID),
		Content:   report.Content,
		CreatedAt: report.CreatedAt.Time,
		FirstView: firstView,
	}, true, nil
}

// GetReport handles GET /api/admin/ci-sessions/{sessionId}/ai-report.
func (c *AdminCIReportController) GetReport(ctx context.Context, req openapi.AdminGetCiReportRequestObject) (openapi.AdminGetCiReportResponseObject, error) {
	resp, found, err := c.getCIReport(ctx, req.SessionId)
	if err != nil {
		return nil, err
	}
	if !found {
		return openapi.AdminGetCiReport404JSONResponse(openapi.ModelsNotFoundError{
			Code:    openapi.ModelsNotFoundErrorCodeNOTFOUND,
			Message: "report not found",
		}), nil
	}
	return openapi.AdminGetCiReport200JSONResponse(*resp), nil
}

// GetReportAsUser handles GET /api/career-interest/sessions/{sessionId}/ai-report.
func (c *AdminCIReportController) GetReportAsUser(ctx context.Context, req openapi.CareerInterestCiGetAiReportRequestObject) (openapi.CareerInterestCiGetAiReportResponseObject, error) {
	resp, found, err := c.getCIReport(ctx, req.SessionId)
	if err != nil {
		return nil, err
	}
	if !found {
		return openapi.CareerInterestCiGetAiReport404JSONResponse(openapi.ModelsNotFoundError{
			Code:    openapi.ModelsNotFoundErrorCodeNOTFOUND,
			Message: "report not found",
		}), nil
	}
	return openapi.CareerInterestCiGetAiReport200JSONResponse(*resp), nil
}

// ListReports handles GET /api/admin/ci-reports/list.
func (c *AdminCIReportController) ListReports(ctx context.Context, _ openapi.AdminListCiReportsRequestObject) (openapi.AdminListCiReportsResponseObject, error) {
	rows, err := c.queries.ListCIAIReports(ctx)
	if err != nil {
		return nil, err
	}

	items := make([]openapi.ModelsAdminAiReportListItem, 0, len(rows))
	for _, r := range rows {
		item := openapi.ModelsAdminAiReportListItem{
			Id:        pgUUIDToString(r.ID),
			SessionId: pgUUIDToString(r.SessionID),
			UserId:    pgUUIDToString(r.UserID),
			Username:  r.Username,
			Name:      r.Name,
			CreatedAt: r.CreatedAt.Time,
		}
		if r.ViewedAt.Valid {
			t := r.ViewedAt.Time
			item.ViewedAt = &t
		}
		items = append(items, item)
	}

	return openapi.AdminListCiReports200JSONResponse(openapi.ModelsAdminAiReportListResponse{
		Reports: items,
		Total:   int32(len(items)), //nolint:gosec // 件数が int32 を超えることはない
	}), nil
}

// ResetViewed handles POST /api/admin/ci-sessions/{sessionId}/reset-viewed.
func (c *AdminCIReportController) ResetViewed(ctx context.Context, req openapi.AdminResetCiReportViewedRequestObject) (openapi.AdminResetCiReportViewedResponseObject, error) {
	if err := c.queries.ResetCIAIReportViewed(ctx, pgUUID(req.SessionId)); err != nil {
		return nil, err
	}
	return openapi.AdminResetCiReportViewed200JSONResponse(openapi.ModelsAdminMessageResponse{Message: "ok"}), nil
}

// GetPrompt handles GET /api/admin/ci-sessions/{sessionId}/prompt.
func (c *AdminCIReportController) GetPrompt(ctx context.Context, req openapi.AdminGetCiPromptRequestObject) (openapi.AdminGetCiPromptResponseObject, error) {
	pgSessionID := pgUUID(req.SessionId)

	basicScores, err := c.queries.GetCIBasicScoresBySessionID(ctx, pgSessionID)
	if err != nil {
		return nil, err
	}
	if len(basicScores) == 0 {
		return openapi.AdminGetCiPrompt404JSONResponse(openapi.ModelsNotFoundError{
			Code:    openapi.ModelsNotFoundErrorCodeNOTFOUND,
			Message: "scores not found",
		}), nil
	}

	typeScores, err := c.queries.GetCITypeScoresBySessionID(ctx, pgSessionID)
	if err != nil {
		return nil, err
	}

	result, err := c.queries.GetCIResultBySessionID(ctx, pgSessionID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return openapi.AdminGetCiPrompt404JSONResponse(openapi.ModelsNotFoundError{
				Code:    openapi.ModelsNotFoundErrorCodeNOTFOUND,
				Message: "result not found",
			}), nil
		}
		return nil, err
	}

	var responses []ciResponse
	if err := json.Unmarshal(result.Responses, &responses); err != nil {
		return nil, err
	}

	template, err := readCIPromptTemplate()
	if err != nil {
		return nil, err
	}

	prompt := buildCIReportPrompt(string(template), typeScores, basicScores, responses)

	return openapi.AdminGetCiPrompt200JSONResponse(openapi.ModelsAdminPromptResponse{Prompt: prompt}), nil
}
