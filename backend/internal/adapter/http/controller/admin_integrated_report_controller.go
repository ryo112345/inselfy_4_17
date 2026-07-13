package controller

import (
	"errors"
	"net/http"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/labstack/echo/v4"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
)

type AdminIntegratedReportController struct {
	queries *generated.Queries
}

func NewAdminIntegratedReportController(pool *pgxpool.Pool) *AdminIntegratedReportController {
	return &AdminIntegratedReportController{queries: generated.New(pool)}
}

func (ctrl *AdminIntegratedReportController) CreateRequest(ctx echo.Context) error {
	userID := authmw.UserID(ctx)

	var body openapi.ModelsCreateIntegratedReportRequest
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

	return ctx.JSON(http.StatusCreated, openapi.ModelsIntegratedReportRequestResponse{
		Id:        pgUUIDToString(req.ID),
		Topic1:    req.Topic1,
		Topic2:    req.Topic2,
		Topic3:    req.Topic3,
		FreeText:  req.FreeText,
		CreatedAt: req.CreatedAt.Time,
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
		if errors.Is(err, pgx.ErrNoRows) {
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
		if errors.Is(err, pgx.ErrNoRows) {
			return notFoundError(ctx, "report not found")
		}
		return internalError(ctx, err.Error())
	}

	firstView := !report.ViewedAt.Valid
	if firstView {
		_ = ctrl.queries.MarkIntegratedReportViewed(ctx.Request().Context(), pgReqID)
	}

	return ctx.JSON(http.StatusOK, openapi.ModelsIntegratedReportResponse{
		Id:        pgUUIDToString(report.ID),
		RequestId: pgUUIDToString(report.RequestID),
		UserId:    pgUUIDToString(report.UserID),
		Content:   report.Content,
		CreatedAt: report.CreatedAt.Time,
		FirstView: firstView,
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
		if errors.Is(err, pgx.ErrNoRows) {
			return notFoundError(ctx, "report not found")
		}
		return internalError(ctx, err.Error())
	}

	firstView := !report.ViewedAt.Valid
	if firstView {
		_ = ctrl.queries.MarkIntegratedReportViewed(ctx.Request().Context(), report.RequestID)
	}

	return ctx.JSON(http.StatusOK, openapi.ModelsIntegratedReportMineResponse{
		Id:        pgUUIDToString(report.ID),
		RequestId: pgUUIDToString(report.RequestID),
		Content:   report.Content,
		CreatedAt: report.CreatedAt.Time,
		FirstView: firstView,
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
		if errors.Is(err, pgx.ErrNoRows) {
			return ctx.JSON(http.StatusOK, openapi.ModelsIntegratedReportStatusResponse{
				Status: openapi.ModelsIntegratedReportStatusResponseStatusNone,
			})
		}
		return internalError(ctx, err.Error())
	}

	report, err := ctrl.queries.GetIntegratedReportByRequestID(ctx.Request().Context(), req.ID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			requestID := pgUUIDToString(req.ID)
			return ctx.JSON(http.StatusOK, openapi.ModelsIntegratedReportStatusResponse{
				Status:    openapi.ModelsIntegratedReportStatusResponseStatusPending,
				RequestId: &requestID,
			})
		}
		return internalError(ctx, err.Error())
	}

	requestID := pgUUIDToString(report.RequestID)
	return ctx.JSON(http.StatusOK, openapi.ModelsIntegratedReportStatusResponse{
		Status:    openapi.ModelsIntegratedReportStatusResponseStatusReady,
		RequestId: &requestID,
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
		if errors.Is(err, pgx.ErrNoRows) {
			return notFoundError(ctx, "not found")
		}
		return internalError(ctx, err.Error())
	}

	hasReport := false
	report, err := ctrl.queries.GetIntegratedReportByRequestID(ctx.Request().Context(), req.ID)
	if err == nil && report != nil {
		hasReport = true
	}

	return ctx.JSON(http.StatusOK, openapi.ModelsIntegratedReportLatestRequestResponse{
		RequestId: pgUUIDToString(req.ID),
		UserId:    pgUUIDToString(req.UserID),
		HasReport: hasReport,
		CreatedAt: req.CreatedAt.Time,
	})
}
