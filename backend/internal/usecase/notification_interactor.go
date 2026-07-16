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

// MarkAsReadByUser marks a single notification read, scoped to its owner: the
// repository only touches the row when it belongs to userID, and returns
// ErrNotFound otherwise. Without the owner scope any logged-in user could mark
// anyone's notification read by passing its ID (IDOR).
func (i *NotificationInteractor) MarkAsReadByUser(ctx context.Context, userID, id string) error {
	return i.repo.MarkAsReadByUserID(ctx, userID, id)
}

// MarkAsReadByCompany is the company-scoped counterpart of MarkAsReadByUser.
func (i *NotificationInteractor) MarkAsReadByCompany(ctx context.Context, companyID, id string) error {
	return i.repo.MarkAsReadByCompanyID(ctx, companyID, id)
}

func (i *NotificationInteractor) MarkAllAsReadByUser(ctx context.Context, userID string) error {
	return i.repo.MarkAllAsReadByUserID(ctx, userID)
}

func (i *NotificationInteractor) MarkAllAsReadByCompany(ctx context.Context, companyID string) error {
	return i.repo.MarkAllAsReadByCompanyID(ctx, companyID)
}
