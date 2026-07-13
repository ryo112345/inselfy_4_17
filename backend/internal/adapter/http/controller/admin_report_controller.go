package controller

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
)

type AdminReportController struct {
	queries *generated.Queries
}

func NewAdminReportController(pool *pgxpool.Pool) *AdminReportController {
	return &AdminReportController{queries: generated.New(pool)}
}

type pendingSessionItem struct {
	SessionID   string  `json:"session_id"`
	UserID      string  `json:"user_id"`
	Username    string  `json:"username"`
	Name        string  `json:"name"`
	CompletedAt *string `json:"completed_at"`
	RequestedAt *string `json:"report_requested_at"`
}

func (c *AdminReportController) ListPending(ctx echo.Context) error {
	rows, err := c.queries.ListSessionsWithoutReport(ctx.Request().Context())
	if err != nil {
		return internalError(ctx, err.Error())
	}

	items := make([]pendingSessionItem, 0, len(rows))
	for _, r := range rows {
		item := pendingSessionItem{
			SessionID: pgUUIDToString(r.SessionID),
			UserID:    pgUUIDToString(r.UserID),
			Username:  r.Username,
			Name:      r.Name,
		}
		if r.CompletedAt.Valid {
			t := r.CompletedAt.Time.Format("2006-01-02T15:04:05Z")
			item.CompletedAt = &t
		}
		if r.ReportRequestedAt.Valid {
			t := r.ReportRequestedAt.Time.UTC().Format("2006-01-02T15:04:05Z")
			item.RequestedAt = &t
		}
		items = append(items, item)
	}

	return ctx.JSON(http.StatusOK, map[string]any{
		"sessions": items,
		"total":    len(items),
	})
}

type saveReportRequest struct {
	Content string `json:"content"`
}

func (c *AdminReportController) SaveReport(ctx echo.Context, sessionID string) error {
	parsedSession, err := uuid.Parse(sessionID)
	if err != nil {
		return badRequest(ctx, "invalid session_id")
	}

	var body saveReportRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid body")
	}
	if body.Content == "" {
		return badRequest(ctx, "content is required")
	}

	pgSessionID := pgtype.UUID{Bytes: parsedSession, Valid: true}

	session, err := c.queries.GetWVSessionByID(ctx.Request().Context(), pgSessionID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return notFoundError(ctx, "session not found")
		}
		return internalError(ctx, err.Error())
	}

	report, err := c.queries.UpsertAIReport(ctx.Request().Context(), &generated.UpsertAIReportParams{
		SessionID: pgSessionID,
		UserID:    session.UserID,
		Content:   body.Content,
	})
	if err != nil {
		return internalError(ctx, err.Error())
	}

	return ctx.JSON(http.StatusOK, map[string]any{
		"id":         pgUUIDToString(report.ID),
		"session_id": pgUUIDToString(report.SessionID),
		"content":    report.Content,
		"created_at": report.CreatedAt.Time.Format("2006-01-02T15:04:05Z"),
	})
}

func (c *AdminReportController) GetSessionScores(ctx echo.Context, sessionID string) error {
	parsedSession, err := uuid.Parse(sessionID)
	if err != nil {
		return badRequest(ctx, "invalid session_id")
	}

	pgSessionID := pgtype.UUID{Bytes: parsedSession, Valid: true}
	row, err := c.queries.GetWVNeedsScoresBySessionID(ctx.Request().Context(), pgSessionID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return notFoundError(ctx, "scores not found")
		}
		return internalError(ctx, err.Error())
	}

	var mu map[string]float64
	var se map[string]float64
	if err := json.Unmarshal(row.Mu, &mu); err != nil {
		return internalError(ctx, "failed to parse mu")
	}
	if err := json.Unmarshal(row.Se, &se); err != nil {
		return internalError(ctx, "failed to parse se")
	}

	resp := map[string]any{
		"mu": mu,
		"se": se,
	}
	if row.ConsistencyCoefficient.Valid {
		resp["consistency_coefficient"] = row.ConsistencyCoefficient.Float32
	}
	if row.ConsistencyLevel.Valid {
		resp["consistency_level"] = row.ConsistencyLevel.String
	}
	return ctx.JSON(http.StatusOK, resp)
}

func (c *AdminReportController) GetReport(ctx echo.Context, sessionID string) error {
	parsedSession, err := uuid.Parse(sessionID)
	if err != nil {
		return badRequest(ctx, "invalid session_id")
	}

	pgSessionID := pgtype.UUID{Bytes: parsedSession, Valid: true}
	report, err := c.queries.GetAIReportBySessionID(ctx.Request().Context(), pgSessionID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return notFoundError(ctx, "report not found")
		}
		return internalError(ctx, err.Error())
	}

	firstView := !report.ViewedAt.Valid
	if firstView {
		_ = c.queries.MarkAIReportViewed(ctx.Request().Context(), pgSessionID)
	}

	return ctx.JSON(http.StatusOK, openapi.ModelsAiReportResponse{
		Id:        pgUUIDToString(report.ID),
		SessionId: pgUUIDToString(report.SessionID),
		Content:   report.Content,
		CreatedAt: report.CreatedAt.Time,
		FirstView: firstView,
	})
}

func (c *AdminReportController) ListReports(ctx echo.Context) error {
	rows, err := c.queries.ListAIReports(ctx.Request().Context())
	if err != nil {
		return internalError(ctx, err.Error())
	}

	items := make([]map[string]any, 0, len(rows))
	for _, r := range rows {
		item := map[string]any{
			"id":         pgUUIDToString(r.ID),
			"session_id": pgUUIDToString(r.SessionID),
			"user_id":    pgUUIDToString(r.UserID),
			"username":   r.Username,
			"created_at": r.CreatedAt.Time.Format("2006-01-02T15:04:05Z"),
			"viewed_at":  nil,
		}
		item["name"] = r.Name
		if r.ViewedAt.Valid {
			item["viewed_at"] = r.ViewedAt.Time.Format("2006-01-02T15:04:05Z")
		}
		items = append(items, item)
	}

	return ctx.JSON(http.StatusOK, map[string]any{
		"reports": items,
		"total":   len(items),
	})
}

func (c *AdminReportController) ResetViewed(ctx echo.Context, sessionID string) error {
	parsedSession, err := uuid.Parse(sessionID)
	if err != nil {
		return badRequest(ctx, "invalid session_id")
	}

	pgSessionID := pgtype.UUID{Bytes: parsedSession, Valid: true}
	if err := c.queries.ResetAIReportViewed(ctx.Request().Context(), pgSessionID); err != nil {
		return internalError(ctx, err.Error())
	}

	return ctx.JSON(http.StatusOK, map[string]string{"message": "ok"})
}
