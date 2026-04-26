package presenter

import (
	"context"
	"time"

	"github.com/akiyama/inselfy/backend/internal/domain/notification"
	"github.com/akiyama/inselfy/backend/internal/port"
)

type notificationResponse struct {
	ID          string    `json:"id"`
	Type        string    `json:"type"`
	Title       string    `json:"title"`
	Body        string    `json:"body"`
	ReferenceID *string   `json:"referenceId"`
	IsRead      bool      `json:"isRead"`
	CreatedAt   time.Time `json:"createdAt"`
}

type notificationListResponse struct {
	Items []*notificationResponse `json:"items"`
	Total int                     `json:"total"`
}

type unreadCountResponse struct {
	Count int `json:"count"`
}

type NotificationPresenter struct {
	list   *notificationListResponse
	count  *unreadCountResponse
	ok     bool
}

var _ port.NotificationOutputPort = (*NotificationPresenter)(nil)

func NewNotificationPresenter() *NotificationPresenter {
	return &NotificationPresenter{}
}

func (p *NotificationPresenter) PresentNotifications(_ context.Context, ns []*notification.Notification, total int) error {
	items := make([]*notificationResponse, len(ns))
	for i, n := range ns {
		items[i] = &notificationResponse{
			ID:          n.ID,
			Type:        string(n.Type),
			Title:       n.Title,
			Body:        n.Body,
			ReferenceID: n.ReferenceID,
			IsRead:      n.IsRead,
			CreatedAt:   n.CreatedAt,
		}
	}
	p.list = &notificationListResponse{Items: items, Total: total}
	return nil
}

func (p *NotificationPresenter) PresentUnreadCount(_ context.Context, count int) error {
	p.count = &unreadCountResponse{Count: count}
	return nil
}

func (p *NotificationPresenter) PresentOK(_ context.Context) error {
	p.ok = true
	return nil
}

func (p *NotificationPresenter) ListResponse() *notificationListResponse { return p.list }
func (p *NotificationPresenter) CountResponse() *unreadCountResponse     { return p.count }
func (p *NotificationPresenter) IsOK() bool                              { return p.ok }
