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

type AdminReportController struct {
	queries *generated.Queries
}

func NewAdminReportController(pool *pgxpool.Pool) *AdminReportController {
	return &AdminReportController{queries: generated.New(pool)}
}

// ListPending handles GET /api/admin/reports/pending.
func (c *AdminReportController) ListPending(ctx context.Context, _ openapi.AdminListPendingWvSessionsRequestObject) (openapi.AdminListPendingWvSessionsResponseObject, error) {
	rows, err := c.queries.ListSessionsWithoutReport(ctx)
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

	return openapi.AdminListPendingWvSessions200JSONResponse(openapi.ModelsAdminPendingSessionsResponse{
		Sessions: items,
		Total:    int32(len(items)), //nolint:gosec // 件数が int32 を超えることはない
	}), nil
}

// SaveReport handles PUT /api/admin/sessions/{sessionId}/ai-report.
func (c *AdminReportController) SaveReport(ctx context.Context, req openapi.AdminSaveWvReportRequestObject) (openapi.AdminSaveWvReportResponseObject, error) {
	if req.Body == nil {
		return openapi.AdminSaveWvReport400JSONResponse(badRequestBody("invalid body")), nil
	}
	if req.Body.Content == "" {
		return openapi.AdminSaveWvReport400JSONResponse(badRequestBody("content is required")), nil
	}

	pgSessionID := pgUUID(req.SessionId)

	session, err := c.queries.GetWVSessionByID(ctx, pgSessionID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return openapi.AdminSaveWvReport404JSONResponse(openapi.ModelsNotFoundError{
				Code:    openapi.ModelsNotFoundErrorCodeNOTFOUND,
				Message: "session not found",
			}), nil
		}
		return nil, err
	}

	report, err := c.queries.UpsertAIReport(ctx, &generated.UpsertAIReportParams{
		SessionID: pgSessionID,
		UserID:    session.UserID,
		Content:   req.Body.Content,
	})
	if err != nil {
		return nil, err
	}

	return openapi.AdminSaveWvReport200JSONResponse(openapi.ModelsAdminSavedAiReportResponse{
		Id:        pgUUIDToString(report.ID),
		SessionId: pgUUIDToString(report.SessionID),
		Content:   report.Content,
		CreatedAt: report.CreatedAt.Time,
	}), nil
}

// GetSessionScores handles GET /api/admin/sessions/{sessionId}/scores.
func (c *AdminReportController) GetSessionScores(ctx context.Context, req openapi.AdminGetWvSessionScoresRequestObject) (openapi.AdminGetWvSessionScoresResponseObject, error) {
	row, err := c.queries.GetWVNeedsScoresBySessionID(ctx, pgUUID(req.SessionId))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return openapi.AdminGetWvSessionScores404JSONResponse(openapi.ModelsNotFoundError{
				Code:    openapi.ModelsNotFoundErrorCodeNOTFOUND,
				Message: "scores not found",
			}), nil
		}
		return nil, err
	}

	var mu map[string]float64
	var se map[string]float64
	if err := json.Unmarshal(row.Mu, &mu); err != nil {
		return nil, err
	}
	if err := json.Unmarshal(row.Se, &se); err != nil {
		return nil, err
	}

	resp := openapi.ModelsAdminSessionScoresResponse{Mu: mu, Se: se}
	if row.ConsistencyCoefficient.Valid {
		v := row.ConsistencyCoefficient.Float32
		resp.ConsistencyCoefficient = &v
	}
	if row.ConsistencyLevel.Valid {
		v := row.ConsistencyLevel.String
		resp.ConsistencyLevel = &v
	}
	return openapi.AdminGetWvSessionScores200JSONResponse(resp), nil
}

// getWVReport is the shared body of the admin and user-facing WV report GETs.
// found=false は「レポート未生成」（404 相当）。初回閲覧はここで記録される。
func (c *AdminReportController) getWVReport(ctx context.Context, sessionID string) (*openapi.ModelsAiReportResponse, bool, error) {
	pgSessionID := pgUUID(sessionID)
	report, err := c.queries.GetAIReportBySessionID(ctx, pgSessionID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, false, nil
		}
		return nil, false, err
	}

	firstView := !report.ViewedAt.Valid
	if firstView {
		_ = c.queries.MarkAIReportViewed(ctx, pgSessionID)
	}

	return &openapi.ModelsAiReportResponse{
		Id:        pgUUIDToString(report.ID),
		SessionId: pgUUIDToString(report.SessionID),
		Content:   report.Content,
		CreatedAt: report.CreatedAt.Time,
		FirstView: firstView,
	}, true, nil
}

// GetReport handles GET /api/admin/sessions/{sessionId}/ai-report.
func (c *AdminReportController) GetReport(ctx context.Context, req openapi.AdminGetWvReportRequestObject) (openapi.AdminGetWvReportResponseObject, error) {
	resp, found, err := c.getWVReport(ctx, req.SessionId)
	if err != nil {
		return nil, err
	}
	if !found {
		return openapi.AdminGetWvReport404JSONResponse(openapi.ModelsNotFoundError{
			Code:    openapi.ModelsNotFoundErrorCodeNOTFOUND,
			Message: "report not found",
		}), nil
	}
	return openapi.AdminGetWvReport200JSONResponse(*resp), nil
}

// GetReportAsUser handles GET /api/work-values/sessions/{sessionId}/ai-report.
func (c *AdminReportController) GetReportAsUser(ctx context.Context, req openapi.WorkValuesWvGetAiReportRequestObject) (openapi.WorkValuesWvGetAiReportResponseObject, error) {
	resp, found, err := c.getWVReport(ctx, req.SessionId)
	if err != nil {
		return nil, err
	}
	if !found {
		return openapi.WorkValuesWvGetAiReport404JSONResponse(openapi.ModelsNotFoundError{
			Code:    openapi.ModelsNotFoundErrorCodeNOTFOUND,
			Message: "report not found",
		}), nil
	}
	return openapi.WorkValuesWvGetAiReport200JSONResponse(*resp), nil
}

// ListReports handles GET /api/admin/reports/list.
func (c *AdminReportController) ListReports(ctx context.Context, _ openapi.AdminListWvReportsRequestObject) (openapi.AdminListWvReportsResponseObject, error) {
	rows, err := c.queries.ListAIReports(ctx)
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

	return openapi.AdminListWvReports200JSONResponse(openapi.ModelsAdminAiReportListResponse{
		Reports: items,
		Total:   int32(len(items)), //nolint:gosec // 件数が int32 を超えることはない
	}), nil
}

// ResetViewed handles POST /api/admin/sessions/{sessionId}/reset-viewed.
func (c *AdminReportController) ResetViewed(ctx context.Context, req openapi.AdminResetWvReportViewedRequestObject) (openapi.AdminResetWvReportViewedResponseObject, error) {
	if err := c.queries.ResetAIReportViewed(ctx, pgUUID(req.SessionId)); err != nil {
		return nil, err
	}
	return openapi.AdminResetWvReportViewed200JSONResponse(openapi.ModelsAdminMessageResponse{Message: "ok"}), nil
}
