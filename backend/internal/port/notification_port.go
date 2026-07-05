package port

import (
	"context"

	"github.com/akiyama/inselfy/backend/internal/domain/notification"
)

type NotificationInputPort interface {
	ListByUser(ctx context.Context, userID string, limit, offset int) ([]*notification.Notification, int, error)
	ListByCompany(ctx context.Context, companyID string, limit, offset int) ([]*notification.Notification, int, error)
	CountUnreadByUser(ctx context.Context, userID string) (int, error)
	CountUnreadByCompany(ctx context.Context, companyID string) (int, error)
	MarkAsRead(ctx context.Context, id string) error
	MarkAllAsReadByUser(ctx context.Context, userID string) error
	MarkAllAsReadByCompany(ctx context.Context, companyID string) error
}

type NotificationRepository interface {
	Create(ctx context.Context, n *notification.Notification) (*notification.Notification, error)
	ListByUserID(ctx context.Context, userID string, limit, offset int) ([]*notification.Notification, int, error)
	ListByCompanyID(ctx context.Context, companyID string, limit, offset int) ([]*notification.Notification, int, error)
	MarkAsRead(ctx context.Context, id string) error
	MarkAllAsReadByUserID(ctx context.Context, userID string) error
	MarkAllAsReadByCompanyID(ctx context.Context, companyID string) error
	CountUnreadByUserID(ctx context.Context, userID string) (int, error)
	CountUnreadByCompanyID(ctx context.Context, companyID string) (int, error)
}
