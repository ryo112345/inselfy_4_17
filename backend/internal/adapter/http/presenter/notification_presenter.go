package presenter

import (
	openapi "github.com/akiyama/inselfy/backend/internal/adapter/http/generated/openapi"
	"github.com/akiyama/inselfy/backend/internal/domain/notification"
	"github.com/akiyama/inselfy/backend/internal/pkg/cast"
)

// NotificationsResponse converts a list of notification entities to their API response.
func NotificationsResponse(ns []*notification.Notification, total int) any {
	items := make([]openapi.ModelsNotificationResponse, len(ns))
	for i, n := range ns {
		items[i] = openapi.ModelsNotificationResponse{
			Id:          n.ID,
			Type:        openapi.ModelsNotificationType(n.Type),
			Title:       n.Title,
			Body:        n.Body,
			ReferenceId: n.ReferenceID,
			IsRead:      n.IsRead,
			CreatedAt:   n.CreatedAt,
		}
	}
	return &openapi.ModelsNotificationListResponse{Items: items, Total: cast.Int32(total)}
}

// NotificationUnreadCountResponse converts an unread count to its API response.
func NotificationUnreadCountResponse(count int) any {
	return &openapi.ModelsUnreadCountResponse{Count: cast.Int32(count)}
}
