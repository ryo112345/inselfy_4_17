package controller

import (
	"context"
	"net/http"

	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	authmw "github.com/akiyama/inselfy/backend/internal/adapter/http/middleware"
	"github.com/akiyama/inselfy/backend/internal/adapter/http/presenter"
	"github.com/akiyama/inselfy/backend/internal/port"
)

// NotificationController handles notification HTTP endpoints.
type NotificationController struct {
	input port.NotificationInputPort
}

// NewNotificationController creates a NotificationController.
func NewNotificationController(
	input port.NotificationInputPort,
) *NotificationController {
	return &NotificationController{input: input}
}

// ListByUser handles GET /api/notifications.
// limit/offset のデフォルト（20/0）は interactor 責務（echo 時代から同じ）。
func (c *NotificationController) ListByUser(ctx context.Context, req openapi.UserNotificationsListUserNotificationsRequestObject) (openapi.UserNotificationsListUserNotificationsResponseObject, error) {
	userID := authmw.UserIDFromContext(ctx)

	ns, total, err := c.input.ListByUser(ctx, userID, derefInt32(req.Params.Limit), derefInt32(req.Params.Offset))
	if err != nil {
		if errorStatus(err) == http.StatusBadRequest {
			return openapi.UserNotificationsListUserNotifications400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.UserNotificationsListUserNotifications200JSONResponse(*presenter.NotificationsResponse(ns, total)), nil
}

// ListByCompany handles GET /api/company/notifications.
func (c *NotificationController) ListByCompany(ctx context.Context, req openapi.CompanyNotificationsListCompanyNotificationsRequestObject) (openapi.CompanyNotificationsListCompanyNotificationsResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)

	ns, total, err := c.input.ListByCompany(ctx, companyID, derefInt32(req.Params.Limit), derefInt32(req.Params.Offset))
	if err != nil {
		if errorStatus(err) == http.StatusBadRequest {
			return openapi.CompanyNotificationsListCompanyNotifications400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CompanyNotificationsListCompanyNotifications200JSONResponse(*presenter.NotificationsResponse(ns, total)), nil
}

// CountUnreadByUser handles GET /api/notifications/unread-count.
func (c *NotificationController) CountUnreadByUser(ctx context.Context, _ openapi.UserNotificationsCountUserUnreadNotificationsRequestObject) (openapi.UserNotificationsCountUserUnreadNotificationsResponseObject, error) {
	userID := authmw.UserIDFromContext(ctx)

	count, err := c.input.CountUnreadByUser(ctx, userID)
	if err != nil {
		if errorStatus(err) == http.StatusBadRequest {
			return openapi.UserNotificationsCountUserUnreadNotifications400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.UserNotificationsCountUserUnreadNotifications200JSONResponse(*presenter.NotificationUnreadCountResponse(count)), nil
}

// CountUnreadByCompany handles GET /api/company/notifications/unread-count.
func (c *NotificationController) CountUnreadByCompany(ctx context.Context, _ openapi.CompanyNotificationsCountCompanyUnreadNotificationsRequestObject) (openapi.CompanyNotificationsCountCompanyUnreadNotificationsResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)

	count, err := c.input.CountUnreadByCompany(ctx, companyID)
	if err != nil {
		if errorStatus(err) == http.StatusBadRequest {
			return openapi.CompanyNotificationsCountCompanyUnreadNotifications400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CompanyNotificationsCountCompanyUnreadNotifications200JSONResponse(*presenter.NotificationUnreadCountResponse(count)), nil
}

// MarkAsReadByUser handles POST /api/notifications/{id}/read.
func (c *NotificationController) MarkAsReadByUser(ctx context.Context, req openapi.UserNotificationsMarkUserNotificationReadRequestObject) (openapi.UserNotificationsMarkUserNotificationReadResponseObject, error) {
	userID := authmw.UserIDFromContext(ctx)

	if err := c.input.MarkAsReadByUser(ctx, userID, req.Id); err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.UserNotificationsMarkUserNotificationRead404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.UserNotificationsMarkUserNotificationRead400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.UserNotificationsMarkUserNotificationRead204Response{}, nil
}

// MarkAsReadByCompany handles POST /api/company/notifications/{id}/read.
func (c *NotificationController) MarkAsReadByCompany(ctx context.Context, req openapi.CompanyNotificationsMarkCompanyNotificationReadRequestObject) (openapi.CompanyNotificationsMarkCompanyNotificationReadResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)

	if err := c.input.MarkAsReadByCompany(ctx, companyID, req.Id); err != nil {
		switch errorStatus(err) {
		case http.StatusNotFound:
			return openapi.CompanyNotificationsMarkCompanyNotificationRead404JSONResponse(notFoundBody(err)), nil
		case http.StatusBadRequest:
			return openapi.CompanyNotificationsMarkCompanyNotificationRead400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CompanyNotificationsMarkCompanyNotificationRead204Response{}, nil
}

// MarkAllAsReadByUser handles POST /api/notifications/read-all.
func (c *NotificationController) MarkAllAsReadByUser(ctx context.Context, _ openapi.UserNotificationsMarkAllUserNotificationsReadRequestObject) (openapi.UserNotificationsMarkAllUserNotificationsReadResponseObject, error) {
	userID := authmw.UserIDFromContext(ctx)

	if err := c.input.MarkAllAsReadByUser(ctx, userID); err != nil {
		if errorStatus(err) == http.StatusBadRequest {
			return openapi.UserNotificationsMarkAllUserNotificationsRead400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.UserNotificationsMarkAllUserNotificationsRead204Response{}, nil
}

// MarkAllAsReadByCompany handles POST /api/company/notifications/read-all.
func (c *NotificationController) MarkAllAsReadByCompany(ctx context.Context, _ openapi.CompanyNotificationsMarkAllCompanyNotificationsReadRequestObject) (openapi.CompanyNotificationsMarkAllCompanyNotificationsReadResponseObject, error) {
	companyID := authmw.CompanyIDFromContext(ctx)

	if err := c.input.MarkAllAsReadByCompany(ctx, companyID); err != nil {
		if errorStatus(err) == http.StatusBadRequest {
			return openapi.CompanyNotificationsMarkAllCompanyNotificationsRead400JSONResponse(badRequestBody(err.Error())), nil
		}
		return nil, err
	}
	return openapi.CompanyNotificationsMarkAllCompanyNotificationsRead204Response{}, nil
}
