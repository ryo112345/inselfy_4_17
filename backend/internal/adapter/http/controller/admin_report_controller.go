package controller

import (
	"encoding/json"
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
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
	DisplayName *string `json:"display_name"`
	CompletedAt *string `json:"completed_at"`
}

func (c *AdminReportController) ListPending(ctx echo.Context) error {
	rows, err := c.queries.ListSessionsWithoutReport(ctx.Request().Context())
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}

	items := make([]pendingSessionItem, 0, len(rows))
	for _, r := range rows {
		item := pendingSessionItem{
			SessionID:   pgUUIDToString(r.SessionID),
			UserID:      pgUUIDToString(r.UserID),
			Username:    r.Username,
			DisplayName: textToPtr(r.DisplayName),
		}
		if r.CompletedAt.Valid {
			t := r.CompletedAt.Time.Format("2006-01-02T15:04:05Z")
			item.CompletedAt = &t
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
		if err == pgx.ErrNoRows {
			return ctx.JSON(http.StatusNotFound, map[string]string{"message": "session not found"})
		}
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}

	report, err := c.queries.UpsertAIReport(ctx.Request().Context(), &generated.UpsertAIReportParams{
		SessionID: pgSessionID,
		UserID:    session.UserID,
		Content:   body.Content,
	})
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
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
		if err == pgx.ErrNoRows {
			return ctx.JSON(http.StatusNotFound, map[string]string{"message": "scores not found"})
		}
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}

	var mu map[string]float64
	var se map[string]float64
	if err := json.Unmarshal(row.Mu, &mu); err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to parse mu"})
	}
	if err := json.Unmarshal(row.Se, &se); err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to parse se"})
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
		if err == pgx.ErrNoRows {
			return ctx.JSON(http.StatusNotFound, map[string]string{"message": "report not found"})
		}
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}

	return ctx.JSON(http.StatusOK, map[string]any{
		"id":         pgUUIDToString(report.ID),
		"session_id": pgUUIDToString(report.SessionID),
		"content":    report.Content,
		"created_at": report.CreatedAt.Time.Format("2006-01-02T15:04:05Z"),
	})
}
