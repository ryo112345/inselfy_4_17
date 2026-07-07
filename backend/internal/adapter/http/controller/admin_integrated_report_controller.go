package controller

import (
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
)

type AdminIntegratedReportController struct {
	queries *generated.Queries
}

func NewAdminIntegratedReportController(pool *pgxpool.Pool) *AdminIntegratedReportController {
	return &AdminIntegratedReportController{queries: generated.New(pool)}
}

type createIntegratedReportRequestBody struct {
	Topic1   int16  `json:"topic1"`
	Topic2   int16  `json:"topic2"`
	Topic3   int16  `json:"topic3"`
	FreeText string `json:"freeText"`
}

func (ctrl *AdminIntegratedReportController) CreateRequest(ctx echo.Context) error {
	userID := authmw.UserID(ctx)

	var body createIntegratedReportRequestBody
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid body")
	}

	if body.Topic1 < 1 || body.Topic1 > 10 || body.Topic2 < 1 || body.Topic2 > 10 || body.Topic3 < 1 || body.Topic3 > 10 {
		return badRequest(ctx, "topics must be between 1 and 10")
	}
	if body.Topic1 == body.Topic2 || body.Topic1 == body.Topic3 || body.Topic2 == body.Topic3 {
		return badRequest(ctx, "topics must be distinct")
	}
	if len([]rune(body.FreeText)) > 200 {
		return badRequest(ctx, "freeText must be 200 characters or less")
	}

	parsedUserID, err := uuid.Parse(userID)
	if err != nil {
		return badRequest(ctx, "invalid user_id")
	}
	pgUserID := pgtype.UUID{Bytes: parsedUserID, Valid: true}

	req, err := ctrl.queries.CreateIntegratedReportRequest(ctx.Request().Context(), &generated.CreateIntegratedReportRequestParams{
		UserID:   pgUserID,
		Topic1:   body.Topic1,
		Topic2:   body.Topic2,
		Topic3:   body.Topic3,
		FreeText: body.FreeText,
	})
	if err != nil {
		return internalError(ctx, err.Error())
	}

	return ctx.JSON(http.StatusCreated, map[string]any{
		"id":        pgUUIDToString(req.ID),
		"topic1":    req.Topic1,
		"topic2":    req.Topic2,
		"topic3":    req.Topic3,
		"freeText":  req.FreeText,
		"createdAt": req.CreatedAt.Time.Format("2006-01-02T15:04:05Z"),
	})
}

func (ctrl *AdminIntegratedReportController) ListPending(ctx echo.Context) error {
	rows, err := ctrl.queries.ListIntegratedRequestsWithoutReport(ctx.Request().Context())
	if err != nil {
		return internalError(ctx, err.Error())
	}

	items := make([]map[string]any, 0, len(rows))
	for _, r := range rows {
		item := map[string]any{
			"request_id": pgUUIDToString(r.RequestID),
			"user_id":    pgUUIDToString(r.UserID),
			"username":   r.Username,
			"topic1":     r.Topic1,
			"topic2":     r.Topic2,
			"topic3":     r.Topic3,
			"free_text":  r.FreeText,
			"created_at": r.CreatedAt.Time.Format("2006-01-02T15:04:05Z"),
		}
		item["name"] = r.Name
		items = append(items, item)
	}

	return ctx.JSON(http.StatusOK, map[string]any{
		"requests": items,
		"total":    len(items),
	})
}

func (ctrl *AdminIntegratedReportController) SaveReport(ctx echo.Context, requestID string) error {
	parsedReqID, err := uuid.Parse(requestID)
	if err != nil {
		return badRequest(ctx, "invalid request_id")
	}

	var body saveReportRequest
	if err := ctx.Bind(&body); err != nil {
		return badRequest(ctx, "invalid body")
	}
	if body.Content == "" {
		return badRequest(ctx, "content is required")
	}

	pgReqID := pgtype.UUID{Bytes: parsedReqID, Valid: true}

	req, err := ctrl.queries.GetIntegratedReportRequestByID(ctx.Request().Context(), pgReqID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return notFoundError(ctx, "request not found")
		}
		return internalError(ctx, err.Error())
	}

	report, err := ctrl.queries.UpsertIntegratedReport(ctx.Request().Context(), &generated.UpsertIntegratedReportParams{
		RequestID: pgReqID,
		UserID:    req.UserID,
		Content:   body.Content,
	})
	if err != nil {
		return internalError(ctx, err.Error())
	}

	return ctx.JSON(http.StatusOK, map[string]any{
		"id":         pgUUIDToString(report.ID),
		"request_id": pgUUIDToString(report.RequestID),
		"content":    report.Content,
		"created_at": report.CreatedAt.Time.Format("2006-01-02T15:04:05Z"),
	})
}

func (ctrl *AdminIntegratedReportController) GetReport(ctx echo.Context, requestID string) error {
	parsedReqID, err := uuid.Parse(requestID)
	if err != nil {
		return badRequest(ctx, "invalid request_id")
	}

	pgReqID := pgtype.UUID{Bytes: parsedReqID, Valid: true}
	report, err := ctrl.queries.GetIntegratedReportByRequestID(ctx.Request().Context(), pgReqID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return notFoundError(ctx, "report not found")
		}
		return internalError(ctx, err.Error())
	}

	firstView := !report.ViewedAt.Valid
	if firstView {
		_ = ctrl.queries.MarkIntegratedReportViewed(ctx.Request().Context(), pgReqID)
	}

	return ctx.JSON(http.StatusOK, map[string]any{
		"id":        pgUUIDToString(report.ID),
		"requestId": pgUUIDToString(report.RequestID),
		"userId":    pgUUIDToString(report.UserID),
		"content":   report.Content,
		"createdAt": report.CreatedAt.Time.Format("2006-01-02T15:04:05Z"),
		"firstView": firstView,
	})
}

func (ctrl *AdminIntegratedReportController) GetReportByUser(ctx echo.Context) error {
	userID := authmw.UserID(ctx)

	parsedUserID, err := uuid.Parse(userID)
	if err != nil {
		return badRequest(ctx, "invalid user_id")
	}
	pgUserID := pgtype.UUID{Bytes: parsedUserID, Valid: true}

	report, err := ctrl.queries.GetLatestIntegratedReportByUserID(ctx.Request().Context(), pgUserID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return notFoundError(ctx, "report not found")
		}
		return internalError(ctx, err.Error())
	}

	firstView := !report.ViewedAt.Valid
	if firstView {
		_ = ctrl.queries.MarkIntegratedReportViewed(ctx.Request().Context(), report.RequestID)
	}

	return ctx.JSON(http.StatusOK, map[string]any{
		"id":        pgUUIDToString(report.ID),
		"requestId": pgUUIDToString(report.RequestID),
		"content":   report.Content,
		"createdAt": report.CreatedAt.Time.Format("2006-01-02T15:04:05Z"),
		"firstView": firstView,
	})
}

func (ctrl *AdminIntegratedReportController) GetRequestStatus(ctx echo.Context) error {
	userID := authmw.UserID(ctx)

	parsedUserID, err := uuid.Parse(userID)
	if err != nil {
		return badRequest(ctx, "invalid user_id")
	}
	pgUserID := pgtype.UUID{Bytes: parsedUserID, Valid: true}

	req, err := ctrl.queries.GetLatestIntegratedReportRequestByUserID(ctx.Request().Context(), pgUserID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return ctx.JSON(http.StatusOK, map[string]any{"status": "none"})
		}
		return internalError(ctx, err.Error())
	}

	report, err := ctrl.queries.GetIntegratedReportByRequestID(ctx.Request().Context(), req.ID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return ctx.JSON(http.StatusOK, map[string]any{
				"status":    "pending",
				"requestId": pgUUIDToString(req.ID),
			})
		}
		return internalError(ctx, err.Error())
	}

	return ctx.JSON(http.StatusOK, map[string]any{
		"status":    "ready",
		"requestId": pgUUIDToString(report.RequestID),
	})
}

func (ctrl *AdminIntegratedReportController) ListReports(ctx echo.Context) error {
	rows, err := ctrl.queries.ListIntegratedReports(ctx.Request().Context())
	if err != nil {
		return internalError(ctx, err.Error())
	}

	items := make([]map[string]any, 0, len(rows))
	for _, r := range rows {
		item := map[string]any{
			"id":         pgUUIDToString(r.ID),
			"request_id": pgUUIDToString(r.RequestID),
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

func (ctrl *AdminIntegratedReportController) ResetViewed(ctx echo.Context, requestID string) error {
	parsedReqID, err := uuid.Parse(requestID)
	if err != nil {
		return badRequest(ctx, "invalid request_id")
	}

	pgReqID := pgtype.UUID{Bytes: parsedReqID, Valid: true}
	if err := ctrl.queries.ResetIntegratedReportViewed(ctx.Request().Context(), pgReqID); err != nil {
		return internalError(ctx, err.Error())
	}

	return ctx.JSON(http.StatusOK, map[string]string{"message": "ok"})
}

func (ctrl *AdminIntegratedReportController) GetLatestRequest(ctx echo.Context, userID string) error {
	parsedUserID, err := uuid.Parse(userID)
	if err != nil {
		return badRequest(ctx, "invalid user_id")
	}
	pgUserID := pgtype.UUID{Bytes: parsedUserID, Valid: true}

	req, err := ctrl.queries.GetLatestIntegratedReportRequestByUserID(ctx.Request().Context(), pgUserID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return notFoundError(ctx, "not found")
		}
		return internalError(ctx, err.Error())
	}

	hasReport := false
	report, err := ctrl.queries.GetIntegratedReportByRequestID(ctx.Request().Context(), req.ID)
	if err == nil && report != nil {
		hasReport = true
	}

	return ctx.JSON(http.StatusOK, map[string]any{
		"requestId": pgUUIDToString(req.ID),
		"userId":    pgUUIDToString(req.UserID),
		"hasReport": hasReport,
		"createdAt": req.CreatedAt.Time.Format("2006-01-02T15:04:05Z"),
	})
}
