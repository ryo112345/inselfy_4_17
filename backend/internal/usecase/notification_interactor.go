package usecase

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/port"
)

type NotificationInteractor struct {
	repo   port.NotificationRepository
	output port.NotificationOutputPort
}

var _ port.NotificationInputPort = (*NotificationInteractor)(nil)

func NewNotificationInteractor(
	repo port.NotificationRepository,
	output port.NotificationOutputPort,
) *NotificationInteractor {
	return &NotificationInteractor{repo: repo, output: output}
}

func (i *NotificationInteractor) ListByUser(ctx context.Context, userID string, limit, offset int) error {
	if limit <= 0 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	ns, total, err := i.repo.ListByUserID(ctx, userID, limit, offset)
	if err != nil {
		return err
	}
	return i.output.PresentNotifications(ctx, ns, total)
}

func (i *NotificationInteractor) ListByCompany(ctx context.Context, companyID string, limit, offset int) error {
	if limit <= 0 {
		limit = 20
	}
	if offset < 0 {
		offset = 0
	}
	ns, total, err := i.repo.ListByCompanyID(ctx, companyID, limit, offset)
	if err != nil {
		return err
	}
	return i.output.PresentNotifications(ctx, ns, total)
}

func (i *NotificationInteractor) CountUnreadByUser(ctx context.Context, userID string) error {
	count, err := i.repo.CountUnreadByUserID(ctx, userID)
	if err != nil {
		return err
	}
	return i.output.PresentUnreadCount(ctx, count)
}

func (i *NotificationInteractor) CountUnreadByCompany(ctx context.Context, companyID string) error {
	count, err := i.repo.CountUnreadByCompanyID(ctx, companyID)
	if err != nil {
		return err
	}
	return i.output.PresentUnreadCount(ctx, count)
}

func (i *NotificationInteractor) MarkAsRead(ctx context.Context, id string) error {
	if err := i.repo.MarkAsRead(ctx, id); err != nil {
		return err
	}
	return i.output.PresentOK(ctx)
}

func (i *NotificationInteractor) MarkAllAsReadByUser(ctx context.Context, userID string) error {
	if err := i.repo.MarkAllAsReadByUserID(ctx, userID); err != nil {
		return err
	}
	return i.output.PresentOK(ctx)
}

func (i *NotificationInteractor) MarkAllAsReadByCompany(ctx context.Context, companyID string) error {
	if err := i.repo.MarkAllAsReadByCompanyID(ctx, companyID); err != nil {
		return err
	}
	return i.output.PresentOK(ctx)
}
