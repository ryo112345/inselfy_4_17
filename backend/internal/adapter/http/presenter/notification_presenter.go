package presenter

import (
	"time"

	"github.com/akiyama/inselfy/backend/internal/domain/notification"
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

// NotificationsResponse converts a list of notification entities to their API response.
func NotificationsResponse(ns []*notification.Notification, total int) any {
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
	return &notificationListResponse{Items: items, Total: total}
}

// NotificationUnreadCountResponse converts an unread count to its API response.
func NotificationUnreadCountResponse(count int) any {
	return &unreadCountResponse{Count: count}
}
