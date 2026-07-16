package sqlc

import (
	"context"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/akiyama/inselfy/backend/internal/adapter/gateway/db/sqlc/generated"
	domainerr "github.com/akiyama/inselfy/backend/internal/domain/errors"
	"github.com/akiyama/inselfy/backend/internal/domain/notification"
	"github.com/akiyama/inselfy/backend/internal/pkg/cast"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type NotificationRepository struct {
	queries *generated.Queries
}

var _ port.NotificationRepository = (*NotificationRepository)(nil)

func NewNotificationRepository(pool *pgxpool.Pool) *NotificationRepository {
	return &NotificationRepository{queries: generated.New(pool)}
}

func (r *NotificationRepository) Create(ctx context.Context, n *notification.Notification) (*notification.Notification, error) {
	q := queriesForContext(ctx, r.queries)
	row, err := q.CreateNotification(ctx, &generated.CreateNotificationParams{
		UserID:      optionalUUID(n.UserID),
		CompanyID:   optionalUUID(n.CompanyID),
		Type:        generated.NotificationType(n.Type),
		Title:       n.Title,
		Body:        n.Body,
		ReferenceID: optionalUUID(n.ReferenceID),
	})
	if err != nil {
		return nil, err
	}
	return notificationToDomain(row), nil
}

func (r *NotificationRepository) ListByUserID(ctx context.Context, userID string, limit, offset int) ([]*notification.Notification, int, error) {
	q := queriesForContext(ctx, r.queries)
	pgUserID, err := parseUUID(userID)
	if err != nil {
		return nil, 0, domainerr.ErrBadRequest
	}
	rows, err := q.ListNotificationsByUserID(ctx, &generated.ListNotificationsByUserIDParams{
		UserID: pgUserID,
		Limit:  cast.Int32(limit),
		Offset: cast.Int32(offset),
	})
	if err != nil {
		return nil, 0, err
	}
	count, err := q.CountNotificationsByUserID(ctx, pgUserID)
	if err != nil {
		return nil, 0, err
	}
	ns := make([]*notification.Notification, len(rows))
	for i, row := range rows {
		ns[i] = notificationToDomain(row)
	}
	return ns, int(count), nil
}

func (r *NotificationRepository) ListByCompanyID(ctx context.Context, companyID string, limit, offset int) ([]*notification.Notification, int, error) {
	q := queriesForContext(ctx, r.queries)
	pgCompanyID, err := parseUUID(companyID)
	if err != nil {
		return nil, 0, domainerr.ErrBadRequest
	}
	rows, err := q.ListNotificationsByCompanyID(ctx, &generated.ListNotificationsByCompanyIDParams{
		CompanyID: pgCompanyID,
		Limit:     cast.Int32(limit),
		Offset:    cast.Int32(offset),
	})
	if err != nil {
		return nil, 0, err
	}
	count, err := q.CountNotificationsByCompanyID(ctx, pgCompanyID)
	if err != nil {
		return nil, 0, err
	}
	ns := make([]*notification.Notification, len(rows))
	for i, row := range rows {
		ns[i] = notificationToDomain(row)
	}
	return ns, int(count), nil
}

func (r *NotificationRepository) MarkAsReadByUserID(ctx context.Context, userID, id string) error {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	pgUserID, err := parseUUID(userID)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	rows, err := q.MarkNotificationAsReadByUserID(ctx, &generated.MarkNotificationAsReadByUserIDParams{ID: pgID, UserID: pgUserID})
	if err != nil {
		return err
	}
	if rows == 0 {
		return domainerr.ErrNotFound
	}
	return nil
}

func (r *NotificationRepository) MarkAsReadByCompanyID(ctx context.Context, companyID, id string) error {
	q := queriesForContext(ctx, r.queries)
	pgID, err := parseUUID(id)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	pgCompanyID, err := parseUUID(companyID)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	rows, err := q.MarkNotificationAsReadByCompanyID(ctx, &generated.MarkNotificationAsReadByCompanyIDParams{ID: pgID, CompanyID: pgCompanyID})
	if err != nil {
		return err
	}
	if rows == 0 {
		return domainerr.ErrNotFound
	}
	return nil
}

func (r *NotificationRepository) MarkAllAsReadByUserID(ctx context.Context, userID string) error {
	q := queriesForContext(ctx, r.queries)
	pgUserID, err := parseUUID(userID)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	return q.MarkAllNotificationsAsReadByUserID(ctx, pgUserID)
}

func (r *NotificationRepository) MarkAllAsReadByCompanyID(ctx context.Context, companyID string) error {
	q := queriesForContext(ctx, r.queries)
	pgCompanyID, err := parseUUID(companyID)
	if err != nil {
		return domainerr.ErrBadRequest
	}
	return q.MarkAllNotificationsAsReadByCompanyID(ctx, pgCompanyID)
}

func (r *NotificationRepository) CountUnreadByUserID(ctx context.Context, userID string) (int, error) {
	q := queriesForContext(ctx, r.queries)
	pgUserID, err := parseUUID(userID)
	if err != nil {
		return 0, domainerr.ErrBadRequest
	}
	count, err := q.CountUnreadNotificationsByUserID(ctx, pgUserID)
	if err != nil {
		return 0, err
	}
	return int(count), nil
}

func (r *NotificationRepository) CountUnreadByCompanyID(ctx context.Context, companyID string) (int, error) {
	q := queriesForContext(ctx, r.queries)
	pgCompanyID, err := parseUUID(companyID)
	if err != nil {
		return 0, domainerr.ErrBadRequest
	}
	count, err := q.CountUnreadNotificationsByCompanyID(ctx, pgCompanyID)
	if err != nil {
		return 0, err
	}
	return int(count), nil
}

func notificationToDomain(row *generated.Notification) *notification.Notification {
	return &notification.Notification{
		ID:          uuidToString(row.ID),
		UserID:      uuidPtr(row.UserID),
		CompanyID:   uuidPtr(row.CompanyID),
		Type:        notification.Type(row.Type),
		Title:       row.Title,
		Body:        row.Body,
		ReferenceID: uuidPtr(row.ReferenceID),
		IsRead:      row.IsRead,
		CreatedAt:   row.CreatedAt.Time,
	}
}
