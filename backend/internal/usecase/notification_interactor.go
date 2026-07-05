package usecase

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/notification"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type NotificationInteractor struct {
	repo port.NotificationRepository
}

var _ port.NotificationInputPort = (*NotificationInteractor)(nil)

func NewNotificationInteractor(
	repo port.NotificationRepository,
) *NotificationInteractor {
	return &NotificationInteractor{repo: repo}
}

func (i *NotificationInteractor) ListByUser(ctx context.Context, userID string, limit, offset int) ([]*notification.Notification, int, error) {
	if limit <= 0 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	return i.repo.ListByUserID(ctx, userID, limit, offset)
}

func (i *NotificationInteractor) ListByCompany(ctx context.Context, companyID string, limit, offset int) ([]*notification.Notification, int, error) {
	if limit <= 0 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	return i.repo.ListByCompanyID(ctx, companyID, limit, offset)
}

func (i *NotificationInteractor) CountUnreadByUser(ctx context.Context, userID string) (int, error) {
	return i.repo.CountUnreadByUserID(ctx, userID)
}

func (i *NotificationInteractor) CountUnreadByCompany(ctx context.Context, companyID string) (int, error) {
	return i.repo.CountUnreadByCompanyID(ctx, companyID)
}

func (i *NotificationInteractor) MarkAsRead(ctx context.Context, id string) error {
	return i.repo.MarkAsRead(ctx, id)
}

func (i *NotificationInteractor) MarkAllAsReadByUser(ctx context.Context, userID string) error {
	return i.repo.MarkAllAsReadByUserID(ctx, userID)
}

func (i *NotificationInteractor) MarkAllAsReadByCompany(ctx context.Context, companyID string) error {
	return i.repo.MarkAllAsReadByCompanyID(ctx, companyID)
}
