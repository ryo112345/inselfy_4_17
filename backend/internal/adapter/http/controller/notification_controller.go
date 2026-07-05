package controller

import (
	"net/http"
	"strconv"

	"github.com/labstack/echo/v4"

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
func (c *NotificationController) ListByUser(ctx echo.Context) error {
	userID := authmw.UserID(ctx)

	limit, _ := strconv.Atoi(ctx.QueryParam("limit"))
	offset, _ := strconv.Atoi(ctx.QueryParam("offset"))

	ns, total, err := c.input.ListByUser(ctx.Request().Context(), userID, limit, offset)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.NotificationsResponse(ns, total))
}

// ListByCompany handles GET /api/company/notifications.
func (c *NotificationController) ListByCompany(ctx echo.Context) error {
	companyID := authmw.CompanyID(ctx)

	limit, _ := strconv.Atoi(ctx.QueryParam("limit"))
	offset, _ := strconv.Atoi(ctx.QueryParam("offset"))

	ns, total, err := c.input.ListByCompany(ctx.Request().Context(), companyID, limit, offset)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.NotificationsResponse(ns, total))
}

// CountUnreadByUser handles GET /api/notifications/unread-count.
func (c *NotificationController) CountUnreadByUser(ctx echo.Context) error {
	userID := authmw.UserID(ctx)

	count, err := c.input.CountUnreadByUser(ctx.Request().Context(), userID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.NotificationUnreadCountResponse(count))
}

// CountUnreadByCompany handles GET /api/company/notifications/unread-count.
func (c *NotificationController) CountUnreadByCompany(ctx echo.Context) error {
	companyID := authmw.CompanyID(ctx)

	count, err := c.input.CountUnreadByCompany(ctx.Request().Context(), companyID)
	if err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, presenter.NotificationUnreadCountResponse(count))
}

// MarkAsRead handles PUT /api/notifications/:id/read.
func (c *NotificationController) MarkAsRead(ctx echo.Context, id string) error {
	if err := c.input.MarkAsRead(ctx.Request().Context(), id); err != nil {
		return handleError(ctx, err)
	}
	return ctx.NoContent(http.StatusNoContent)
}

// MarkAllAsReadByUser handles PUT /api/notifications/read-all.
func (c *NotificationController) MarkAllAsReadByUser(ctx echo.Context) error {
	userID := authmw.UserID(ctx)

	if err := c.input.MarkAllAsReadByUser(ctx.Request().Context(), userID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.NoContent(http.StatusNoContent)
}

// MarkAllAsReadByCompany handles PUT /api/company/notifications/read-all.
func (c *NotificationController) MarkAllAsReadByCompany(ctx echo.Context) error {
	companyID := authmw.CompanyID(ctx)

	if err := c.input.MarkAllAsReadByCompany(ctx.Request().Context(), companyID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.NoContent(http.StatusNoContent)
}
