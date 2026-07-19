package controller

import (
	"context"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

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

// CreateRequest handles POST /api/integrated-report/requests.
func (ctrl *AdminIntegratedReportController) CreateRequest(ctx context.Context, reqObj openapi.IntegratedReportCreateIntegratedReportRequestRequestObject) (openapi.IntegratedReportCreateIntegratedReportRequestResponseObject, error) {
	userID := authmw.UserIDFromContext(ctx)
	if reqObj.Body == nil {
		return openapi.IntegratedReportCreateIntegratedReportRequest400JSONResponse(badRequestBody("invalid body")), nil
	}
	body := reqObj.Body

	if body.Topic1 < 1 || body.Topic1 > 10 || body.Topic2 < 1 || body.Topic2 > 10 || body.Topic3 < 1 || body.Topic3 > 10 {
		return openapi.IntegratedReportCreateIntegratedReportRequest400JSONResponse(badRequestBody("topics must be between 1 and 10")), nil
	}
	if body.Topic1 == body.Topic2 || body.Topic1 == body.Topic3 || body.Topic2 == body.Topic3 {
		return openapi.IntegratedReportCreateIntegratedReportRequest400JSONResponse(badRequestBody("topics must be distinct")), nil
	}
	if strings.TrimSpace(body.FreeText) == "" {
		return openapi.IntegratedReportCreateIntegratedReportRequest400JSONResponse(badRequestBody("freeText is required")), nil
	}
	if len([]rune(body.FreeText)) > 200 {
		return openapi.IntegratedReportCreateIntegratedReportRequest400JSONResponse(badRequestBody("freeText must be 200 characters or less")), nil
	}

	// 生成条件（UIのゲートと同一条件をAPIでも強制）: WV/CI 診断完了＋職歴・スキル・学歴の入力
	if _, err := ctrl.queries.GetLatestWVCompletedSessionByUserID(ctx, pgUUID(userID)); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return openapi.IntegratedReportCreateIntegratedReportRequest400JSONResponse(badRequestBody("work values diagnosis must be completed")), nil
		}
		return nil, err
	}
	if _, err := ctrl.queries.GetLatestCICompletedSessionByUserID(ctx, pgUUID(userID)); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return openapi.IntegratedReportCreateIntegratedReportRequest400JSONResponse(badRequestBody("career interest diagnosis must be completed")), nil
		}
		return nil, err
	}
	experiences, err := ctrl.queries.ListExperiencesByUserID(ctx, pgUUID(userID))
	if err != nil {
		return nil, err
	}
	if len(experiences) == 0 {
		return openapi.IntegratedReportCreateIntegratedReportRequest400JSONResponse(badRequestBody("at least one experience is required")), nil
	}
	skills, err := ctrl.queries.ListUserSkills(ctx, pgUUID(userID))
	if err != nil {
		return nil, err
	}
	if len(skills) == 0 {
		return openapi.IntegratedReportCreateIntegratedReportRequest400JSONResponse(badRequestBody("at least one skill is required")), nil
	}
	educations, err := ctrl.queries.ListEducationsByUserID(ctx, pgUUID(userID))
	if err != nil {
		return nil, err
	}
	if len(educations) == 0 {
		return openapi.IntegratedReportCreateIntegratedReportRequest400JSONResponse(badRequestBody("at least one education is required")), nil
	}

	req, err := ctrl.queries.CreateIntegratedReportRequest(ctx, &generated.CreateIntegratedReportRequestParams{
		UserID:   pgUUID(userID),
		Topic1:   body.Topic1,
		Topic2:   body.Topic2,
		Topic3:   body.Topic3,
		FreeText: body.FreeText,
	})
	if err != nil {
		return nil, err
	}

	return openapi.IntegratedReportCreateIntegratedReportRequest201JSONResponse(openapi.ModelsIntegratedReportRequestResponse{
		Id:        pgUUIDToString(req.ID),
		Topic1:    req.Topic1,
		Topic2:    req.Topic2,
		Topic3:    req.Topic3,
		FreeText:  req.FreeText,
		CreatedAt: req.CreatedAt.Time,
	}), nil
}

// ListPending handles GET /api/admin/integrated-reports/pending.
func (ctrl *AdminIntegratedReportController) ListPending(ctx context.Context, _ openapi.AdminListPendingIntegratedRequestsRequestObject) (openapi.AdminListPendingIntegratedRequestsResponseObject, error) {
	rows, err := ctrl.queries.ListIntegratedRequestsWithoutReport(ctx)
	if err != nil {
		return nil, err
	}

	items := make([]openapi.ModelsAdminPendingIntegratedRequestItem, 0, len(rows))
	for _, r := range rows {
		items = append(items, openapi.ModelsAdminPendingIntegratedRequestItem{
			RequestId: pgUUIDToString(r.RequestID),
			UserId:    pgUUIDToString(r.UserID),
			Username:  r.Username,
			Name:      r.Name,
			Topic1:    r.Topic1,
			Topic2:    r.Topic2,
			Topic3:    r.Topic3,
			FreeText:  r.FreeText,
			CreatedAt: r.CreatedAt.Time,
		})
	}

	return openapi.AdminListPendingIntegratedRequests200JSONResponse(openapi.ModelsAdminPendingIntegratedRequestsResponse{
		Requests: items,
		Total:    int32(len(items)), //nolint:gosec // 件数が int32 を超えることはない
	}), nil
}

// SaveReport handles PUT /api/admin/integrated-requests/{requestId}/ai-report.
func (ctrl *AdminIntegratedReportController) SaveReport(ctx context.Context, reqObj openapi.AdminSaveIntegratedReportRequestObject) (openapi.AdminSaveIntegratedReportResponseObject, error) {
	if reqObj.Body == nil {
		return openapi.AdminSaveIntegratedReport400JSONResponse(badRequestBody("invalid body")), nil
	}
	if reqObj.Body.Content == "" {
		return openapi.AdminSaveIntegratedReport400JSONResponse(badRequestBody("content is required")), nil
	}

	pgReqID := pgUUID(reqObj.RequestId)

	req, err := ctrl.queries.GetIntegratedReportRequestByID(ctx, pgReqID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return openapi.AdminSaveIntegratedReport404JSONResponse(openapi.ModelsNotFoundError{
				Code:    openapi.ModelsNotFoundErrorCodeNOTFOUND,
				Message: "request not found",
			}), nil
		}
		return nil, err
	}

	report, err := ctrl.queries.UpsertIntegratedReport(ctx, &generated.UpsertIntegratedReportParams{
		RequestID: pgReqID,
		UserID:    req.UserID,
		Content:   reqObj.Body.Content,
	})
	if err != nil {
		return nil, err
	}

	return openapi.AdminSaveIntegratedReport200JSONResponse(openapi.ModelsAdminSavedIntegratedReportResponse{
		Id:        pgUUIDToString(report.ID),
		RequestId: pgUUIDToString(report.RequestID),
		Content:   report.Content,
		CreatedAt: report.CreatedAt.Time,
	}), nil
}

// getIntegratedReport is the shared body of the admin and user-facing report GETs.
func (ctrl *AdminIntegratedReportController) getIntegratedReport(ctx context.Context, requestID string) (*openapi.ModelsIntegratedReportResponse, bool, error) {
	pgReqID := pgUUID(requestID)
	report, err := ctrl.queries.GetIntegratedReportByRequestID(ctx, pgReqID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, false, nil
		}
		return nil, false, err
	}

	firstView := !report.ViewedAt.Valid
	if firstView {
		_ = ctrl.queries.MarkIntegratedReportViewed(ctx, pgReqID)
	}

	return &openapi.ModelsIntegratedReportResponse{
		Id:        pgUUIDToString(report.ID),
		RequestId: pgUUIDToString(report.RequestID),
		UserId:    pgUUIDToString(report.UserID),
		Content:   report.Content,
		CreatedAt: report.CreatedAt.Time,
		FirstView: firstView,
	}, true, nil
}

// GetReportAsAdmin handles GET /api/admin/integrated-requests/{requestId}/ai-report.
func (ctrl *AdminIntegratedReportController) GetReportAsAdmin(ctx context.Context, reqObj openapi.AdminGetIntegratedReportAsAdminRequestObject) (openapi.AdminGetIntegratedReportAsAdminResponseObject, error) {
	resp, found, err := ctrl.getIntegratedReport(ctx, reqObj.RequestId)
	if err != nil {
		return nil, err
	}
	if !found {
		return openapi.AdminGetIntegratedReportAsAdmin404JSONResponse(openapi.ModelsNotFoundError{
			Code:    openapi.ModelsNotFoundErrorCodeNOTFOUND,
			Message: "report not found",
		}), nil
	}
	return openapi.AdminGetIntegratedReportAsAdmin200JSONResponse(*resp), nil
}

// GetReportAsUser handles GET /api/integrated-report/requests/{requestId}/report.
func (ctrl *AdminIntegratedReportController) GetReportAsUser(ctx context.Context, reqObj openapi.IntegratedReportGetIntegratedReportRequestObject) (openapi.IntegratedReportGetIntegratedReportResponseObject, error) {
	resp, found, err := ctrl.getIntegratedReport(ctx, reqObj.RequestId)
	if err != nil {
		return nil, err
	}
	if !found {
		return openapi.IntegratedReportGetIntegratedReport404JSONResponse(openapi.ModelsNotFoundError{
			Code:    openapi.ModelsNotFoundErrorCodeNOTFOUND,
			Message: "report not found",
		}), nil
	}
	return openapi.IntegratedReportGetIntegratedReport200JSONResponse(*resp), nil
}

// GetReportByUser handles GET /api/integrated-report/me.
func (ctrl *AdminIntegratedReportController) GetReportByUser(ctx context.Context, _ openapi.IntegratedReportGetMyIntegratedReportRequestObject) (openapi.IntegratedReportGetMyIntegratedReportResponseObject, error) {
	userID := authmw.UserIDFromContext(ctx)

	report, err := ctrl.queries.GetLatestIntegratedReportByUserID(ctx, pgUUID(userID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return openapi.IntegratedReportGetMyIntegratedReport404JSONResponse(openapi.ModelsNotFoundError{
				Code:    openapi.ModelsNotFoundErrorCodeNOTFOUND,
				Message: "report not found",
			}), nil
		}
		return nil, err
	}

	firstView := !report.ViewedAt.Valid
	if firstView {
		_ = ctrl.queries.MarkIntegratedReportViewed(ctx, report.RequestID)
	}

	return openapi.IntegratedReportGetMyIntegratedReport200JSONResponse(openapi.ModelsIntegratedReportMineResponse{
		Id:        pgUUIDToString(report.ID),
		RequestId: pgUUIDToString(report.RequestID),
		Content:   report.Content,
		CreatedAt: report.CreatedAt.Time,
		FirstView: firstView,
	}), nil
}

// GetRequestStatus handles GET /api/integrated-report/status.
func (ctrl *AdminIntegratedReportController) GetRequestStatus(ctx context.Context, _ openapi.IntegratedReportGetIntegratedReportStatusRequestObject) (openapi.IntegratedReportGetIntegratedReportStatusResponseObject, error) {
	userID := authmw.UserIDFromContext(ctx)

	req, err := ctrl.queries.GetLatestIntegratedReportRequestByUserID(ctx, pgUUID(userID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return openapi.IntegratedReportGetIntegratedReportStatus200JSONResponse(openapi.ModelsIntegratedReportStatusResponse{
				Status: openapi.ModelsIntegratedReportStatusResponseStatusNone,
			}), nil
		}
		return nil, err
	}

	report, err := ctrl.queries.GetIntegratedReportByRequestID(ctx, req.ID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			requestID := pgUUIDToString(req.ID)
			return openapi.IntegratedReportGetIntegratedReportStatus200JSONResponse(openapi.ModelsIntegratedReportStatusResponse{
				Status:    openapi.ModelsIntegratedReportStatusResponseStatusPending,
				RequestId: &requestID,
			}), nil
		}
		return nil, err
	}

	requestID := pgUUIDToString(report.RequestID)
	return openapi.IntegratedReportGetIntegratedReportStatus200JSONResponse(openapi.ModelsIntegratedReportStatusResponse{
		Status:    openapi.ModelsIntegratedReportStatusResponseStatusReady,
		RequestId: &requestID,
	}), nil
}

// ListReports handles GET /api/admin/integrated-reports/list.
func (ctrl *AdminIntegratedReportController) ListReports(ctx context.Context, _ openapi.AdminListIntegratedReportsRequestObject) (openapi.AdminListIntegratedReportsResponseObject, error) {
	rows, err := ctrl.queries.ListIntegratedReports(ctx)
	if err != nil {
		return nil, err
	}

	items := make([]openapi.ModelsAdminIntegratedReportListItem, 0, len(rows))
	for _, r := range rows {
		item := openapi.ModelsAdminIntegratedReportListItem{
			Id:        pgUUIDToString(r.ID),
			RequestId: pgUUIDToString(r.RequestID),
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

	return openapi.AdminListIntegratedReports200JSONResponse(openapi.ModelsAdminIntegratedReportListResponse{
		Reports: items,
		Total:   int32(len(items)), //nolint:gosec // 件数が int32 を超えることはない
	}), nil
}

// ResetViewed handles POST /api/admin/integrated-requests/{requestId}/reset-viewed.
func (ctrl *AdminIntegratedReportController) ResetViewed(ctx context.Context, reqObj openapi.AdminResetIntegratedReportViewedRequestObject) (openapi.AdminResetIntegratedReportViewedResponseObject, error) {
	if err := ctrl.queries.ResetIntegratedReportViewed(ctx, pgUUID(reqObj.RequestId)); err != nil {
		return nil, err
	}
	return openapi.AdminResetIntegratedReportViewed200JSONResponse(openapi.ModelsAdminMessageResponse{Message: "ok"}), nil
}

// GetLatestRequest handles GET /api/integrated-report/users/{userId}/latest-request.
func (ctrl *AdminIntegratedReportController) GetLatestRequest(ctx context.Context, reqObj openapi.IntegratedReportGetLatestIntegratedRequestRequestObject) (openapi.IntegratedReportGetLatestIntegratedRequestResponseObject, error) {
	req, err := ctrl.queries.GetLatestIntegratedReportRequestByUserID(ctx, pgUUID(reqObj.UserId))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return openapi.IntegratedReportGetLatestIntegratedRequest404JSONResponse(openapi.ModelsNotFoundError{
				Code:    openapi.ModelsNotFoundErrorCodeNOTFOUND,
				Message: "not found",
			}), nil
		}
		return nil, err
	}

	hasReport := false
	report, err := ctrl.queries.GetIntegratedReportByRequestID(ctx, req.ID)
	if err == nil && report != nil {
		hasReport = true
	}

	return openapi.IntegratedReportGetLatestIntegratedRequest200JSONResponse(openapi.ModelsIntegratedReportLatestRequestResponse{
		RequestId: pgUUIDToString(req.ID),
		UserId:    pgUUIDToString(req.UserID),
		HasReport: hasReport,
		CreatedAt: req.CreatedAt.Time,
	}), nil
}
