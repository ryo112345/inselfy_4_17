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

type AdminCIReportController struct {
	queries *generated.Queries
}

func NewAdminCIReportController(pool *pgxpool.Pool) *AdminCIReportController {
	return &AdminCIReportController{queries: generated.New(pool)}
}

func (c *AdminCIReportController) ListPending(ctx echo.Context) error {
	rows, err := c.queries.ListCISessionsWithoutReport(ctx.Request().Context())
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

func (c *AdminCIReportController) SaveReport(ctx echo.Context, sessionID string) error {
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

	session, err := c.queries.GetCISessionByID(ctx.Request().Context(), pgSessionID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return ctx.JSON(http.StatusNotFound, map[string]string{"message": "session not found"})
		}
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}

	report, err := c.queries.UpsertCIAIReport(ctx.Request().Context(), &generated.UpsertCIAIReportParams{
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

func (c *AdminCIReportController) GetReport(ctx echo.Context, sessionID string) error {
	parsedSession, err := uuid.Parse(sessionID)
	if err != nil {
		return badRequest(ctx, "invalid session_id")
	}

	pgSessionID := pgtype.UUID{Bytes: parsedSession, Valid: true}
	report, err := c.queries.GetCIAIReportBySessionID(ctx.Request().Context(), pgSessionID)
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

func (c *AdminCIReportController) GetPrompt(ctx echo.Context, sessionID string) error {
	parsedSession, err := uuid.Parse(sessionID)
	if err != nil {
		return badRequest(ctx, "invalid session_id")
	}

	pgSessionID := pgtype.UUID{Bytes: parsedSession, Valid: true}

	basicScores, err := c.queries.GetCIBasicScoresBySessionID(ctx.Request().Context(), pgSessionID)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}
	if len(basicScores) == 0 {
		return ctx.JSON(http.StatusNotFound, map[string]string{"message": "scores not found"})
	}

	typeScores, err := c.queries.GetCITypeScoresBySessionID(ctx.Request().Context(), pgSessionID)
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}

	result, err := c.queries.GetCIResultBySessionID(ctx.Request().Context(), pgSessionID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return ctx.JSON(http.StatusNotFound, map[string]string{"message": "result not found"})
		}
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": err.Error()})
	}

	var responses []ciResponse
	if err := json.Unmarshal(result.Responses, &responses); err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to parse responses"})
	}

	template, err := readCIPromptTemplate()
	if err != nil {
		return ctx.JSON(http.StatusInternalServerError, map[string]string{"message": "failed to read prompt template: " + err.Error()})
	}

	prompt := buildCIReportPrompt(string(template), typeScores, basicScores, responses)

	return ctx.JSON(http.StatusOK, map[string]string{
		"prompt": prompt,
	})
}
