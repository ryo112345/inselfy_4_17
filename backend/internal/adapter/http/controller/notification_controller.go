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
	inputFactory  func(repo port.NotificationRepository, output port.NotificationOutputPort) port.NotificationInputPort
	outputFactory func() *presenter.NotificationPresenter
	repoFactory   func() port.NotificationRepository
}

// NewNotificationController creates a NotificationController.
func NewNotificationController(
	inputFactory func(repo port.NotificationRepository, output port.NotificationOutputPort) port.NotificationInputPort,
	outputFactory func() *presenter.NotificationPresenter,
	repoFactory func() port.NotificationRepository,
) *NotificationController {
	return &NotificationController{
		inputFactory:  inputFactory,
		outputFactory: outputFactory,
		repoFactory:   repoFactory,
	}
}

// ListByUser handles GET /api/notifications.
func (c *NotificationController) ListByUser(ctx echo.Context) error {
	userID, ok := ctx.Get(authmw.UserIDKey).(string)
	if !ok || userID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	limit, _ := strconv.Atoi(ctx.QueryParam("limit"))
	offset, _ := strconv.Atoi(ctx.QueryParam("offset"))

	input, p := c.newIO()
	if err := input.ListByUser(ctx.Request().Context(), userID, limit, offset); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.ListResponse())
}

// ListByCompany handles GET /api/company/notifications.
func (c *NotificationController) ListByCompany(ctx echo.Context) error {
	companyID, ok := ctx.Get(authmw.CompanyIDKey).(string)
	if !ok || companyID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	limit, _ := strconv.Atoi(ctx.QueryParam("limit"))
	offset, _ := strconv.Atoi(ctx.QueryParam("offset"))

	input, p := c.newIO()
	if err := input.ListByCompany(ctx.Request().Context(), companyID, limit, offset); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.ListResponse())
}

// CountUnreadByUser handles GET /api/notifications/unread-count.
func (c *NotificationController) CountUnreadByUser(ctx echo.Context) error {
	userID, ok := ctx.Get(authmw.UserIDKey).(string)
	if !ok || userID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	input, p := c.newIO()
	if err := input.CountUnreadByUser(ctx.Request().Context(), userID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.CountResponse())
}

// CountUnreadByCompany handles GET /api/company/notifications/unread-count.
func (c *NotificationController) CountUnreadByCompany(ctx echo.Context) error {
	companyID, ok := ctx.Get(authmw.CompanyIDKey).(string)
	if !ok || companyID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	input, p := c.newIO()
	if err := input.CountUnreadByCompany(ctx.Request().Context(), companyID); err != nil {
		return handleError(ctx, err)
	}
	return ctx.JSON(http.StatusOK, p.CountResponse())
}

// MarkAsRead handles PUT /api/notifications/:id/read.
func (c *NotificationController) MarkAsRead(ctx echo.Context, id string) error {
	input, p := c.newIO()
	if err := input.MarkAsRead(ctx.Request().Context(), id); err != nil {
		return handleError(ctx, err)
	}
	if !p.IsOK() {
		return ctx.NoContent(http.StatusInternalServerError)
	}
	return ctx.NoContent(http.StatusNoContent)
}

// MarkAllAsReadByUser handles PUT /api/notifications/read-all.
func (c *NotificationController) MarkAllAsReadByUser(ctx echo.Context) error {
	userID, ok := ctx.Get(authmw.UserIDKey).(string)
	if !ok || userID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	input, p := c.newIO()
	if err := input.MarkAllAsReadByUser(ctx.Request().Context(), userID); err != nil {
		return handleError(ctx, err)
	}
	if !p.IsOK() {
		return ctx.NoContent(http.StatusInternalServerError)
	}
	return ctx.NoContent(http.StatusNoContent)
}

// MarkAllAsReadByCompany handles PUT /api/company/notifications/read-all.
func (c *NotificationController) MarkAllAsReadByCompany(ctx echo.Context) error {
	companyID, ok := ctx.Get(authmw.CompanyIDKey).(string)
	if !ok || companyID == "" {
		return ctx.JSON(http.StatusUnauthorized, map[string]string{
			"code":    "UNAUTHORIZED",
			"message": "unauthorized",
		})
	}

	input, p := c.newIO()
	if err := input.MarkAllAsReadByCompany(ctx.Request().Context(), companyID); err != nil {
		return handleError(ctx, err)
	}
	if !p.IsOK() {
		return ctx.NoContent(http.StatusInternalServerError)
	}
	return ctx.NoContent(http.StatusNoContent)
}

func (c *NotificationController) newIO() (port.NotificationInputPort, *presenter.NotificationPresenter) {
	output := c.outputFactory()
	input := c.inputFactory(c.repoFactory(), output)
	return input, output
}
